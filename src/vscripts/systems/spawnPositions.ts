import { battleLinePosition, type Side } from "../lib/battleLines";
import { PLAYERS_PER_TEAM, SPAWN_LINE_X, SPAWN_SPACING } from "../config";

/**
 * Fixed per-team spawn slots on two battle lines either side of the river.
 *
 * A Hammer map ships spawn points for its stock teams' lanes, but this is a
 * script-only arena with no `.vmap` yet — so every hero would spawn at the world
 * origin, both teams in one pile, every respawn (landmine L7). This system
 * teleports each real hero on every spawn to its team's slot: Radiant on the
 * negative-X line, Dire on positive X, spread along Y.
 *
 * The geometry is pure and unit-tested in `lib/battleLines.ts`; this file is the
 * thin engine-facing shell (the purity split from playbook chapter 05).
 */
export class SpawnPositions {
    constructor(private readonly teamSides: ReadonlyMap<DotaTeam, Side>) {
        ListenToGameEvent("npc_spawned", event => this.onNpcSpawned(event), undefined);
    }

    private onNpcSpawned(event: NpcSpawnedEvent): void {
        const unit = EntIndexToHScript(event.entindex) as CDOTA_BaseNPC | undefined;
        if (!unit || !unit.IsRealHero()) return;

        const team = unit.GetTeamNumber();
        const side = this.teamSides.get(team);
        if (side === undefined) return; // spectator or neutral — leave it be

        const slot = this.teamSlot(unit.GetPlayerOwnerID(), team);
        const [x, y] = battleLinePosition(side, slot, PLAYERS_PER_TEAM, SPAWN_LINE_X, SPAWN_SPACING);

        // Wait one frame: CreateHeroForPlayer / ReplaceHeroWith finish
        // positioning the unit AFTER npc_spawned fires, so a synchronous
        // teleport here would be silently overwritten.
        Timers.CreateTimer(0.03, () => {
            if (unit.IsNull() || !unit.IsAlive()) return;
            FindClearSpaceForUnit(unit, GetGroundPosition(Vector(x, y, 0), unit), true);
            unit.Stop();
        });
    }

    /**
     * This player's stable index within its team: the count of same-team players
     * with a lower player id. Deterministic, so a player keeps the same slot
     * across respawns. At most a handful of players, so the scan is cheap.
     */
    private teamSlot(playerId: PlayerID, team: DotaTeam): number {
        let slot = 0;
        for (let i = 0; i < 24; i++) {
            const other = i as PlayerID;
            if (other === playerId) continue;
            if (!PlayerResource.IsValidPlayerID(other)) continue;
            if (PlayerResource.GetTeam(other) !== team) continue;
            if (other < playerId) slot++;
        }
        return slot;
    }
}
