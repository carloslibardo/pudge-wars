import { reloadable } from "./lib/tstl-utils";
import { ScoreTracker } from "./lib/score";
import { Marker } from "./lib/markers";
import { SpawnPositions } from "./systems/spawnPositions";
import { E2EHarness, e2eEnabled, e2eKillTarget } from "./systems/e2eHarness";
import { KILLS_TO_WIN, PLAYERS_PER_TEAM, RESPAWN_SECONDS, STARTING_GOLD } from "./config";
import type { Side } from "./lib/battleLines";

// Abilities and modifiers are imported for their @register* decorator SIDE
// EFFECT — TSTL only emits Lua for modules reachable from the entry point, so
// an unimported ability simply does not exist at runtime, with no error (L8).
// Bases (dota_ts_adapter) load first via these modules' own imports.
import "./abilities/pudge_meat_hook";
import "./modifiers/modifier_pudge_hook_drag";
import "./abilities/pudge_rot";
import "./modifiers/modifier_pudge_rot";
import "./modifiers/modifier_pudge_rot_slow";
import "./abilities/pudge_flesh_heap";
import "./modifiers/modifier_pudge_flesh_heap";

declare global {
    interface CDOTAGameRules {
        Addon: GameMode;
    }
}

/**
 * Two teams facing across the river. Radiant on the negative-X side, Dire on
 * positive X (see `lib/battleLines.ts` / `systems/spawnPositions.ts`). Score is
 * per-TEAM: the win condition is a team total, so the tracker is keyed by team
 * number, not player.
 */
const TEAM_SIDES = new Map<DotaTeam, Side>([
    [DotaTeam.GOODGUYS, -1],
    [DotaTeam.BADGUYS, 1],
]);

@reloadable
export class GameMode {
    private score = new ScoreTracker(e2eKillTarget(KILLS_TO_WIN));
    private e2e = new E2EHarness();

    public static Precache(this: void, context: CScriptPrecacheContext) {
        // Everyone is Pudge — precache the base hero or CreateHeroForPlayer
        // fails "unit ... is invalid" (L3).
        PrecacheUnitByNameSync("npc_dota_hero_pudge", context);
        // Un-precached particles render NOTHING, silently (L3/L12). Precaching
        // the hero covers most Pudge assets, but pin the hook chain explicitly.
        PrecacheResource("particle", "particles/units/heroes/hero_pudge/pudge_meathook.vpcf", context);
        PrecacheResource("particle", "particles/units/heroes/hero_pudge/pudge_rot.vpcf", context);
    }

    public static Activate(this: void) {
        Convars.RegisterConvar("pudge_wars_e2e", "0", "Engage the headless e2e harness (tools only)", ConVarFlags.NONE);
        Convars.RegisterConvar("pudge_wars_e2e_kills", "0", "e2e win-threshold override (0 = real KILLS_TO_WIN)", ConVarFlags.NONE);
        GameRules.Addon = new GameMode();
    }

    constructor() {
        this.configure();
        ListenToGameEvent("game_rules_state_change", () => this.onStateChange(), undefined);
        // Custom-game teams get no Hammer spawn points, so without this every
        // hero spawns at the world origin in one pile (L7). This puts the two
        // teams on their mirrored battle lines each spawn.
        new SpawnPositions(TEAM_SIDES);
    }

    private configure(): void {
        for (const team of TEAM_SIDES.keys()) {
            GameRules.SetCustomGameTeamMaxPlayers(team, PLAYERS_PER_TEAM);
        }
        GameRules.SetHeroSelectionTime(0);
        GameRules.SetStrategyTime(0);
        GameRules.SetShowcaseTime(0);
        GameRules.SetPreGameTime(5);

        const mode = GameRules.GetGameModeEntity();
        // MUST be the BASE hero name. Everyone is Pudge, forced — a "_custom"
        // name would not resolve and hand players a random stock hero at the
        // selection timeout (L2). GetUnitName() returns "npc_dota_hero_pudge".
        mode.SetCustomGameForceHero("npc_dota_hero_pudge");
        mode.SetFixedRespawnTime(RESPAWN_SECONDS);
        mode.SetAnnouncerDisabled(true);
        // No fountain in this arena; without universal shop mode every native
        // store purchase strands in the stash forever (L13). Items: spec 005.
        GameRules.SetUseUniversalShopMode(true);

        ListenToGameEvent("entity_killed", event => this.onEntityKilled(event), undefined);
    }

    private onStateChange(): void {
        const state = GameRules.State_Get();
        if (state === GameState.CUSTOM_GAME_SETUP) {
            this.e2e.seatEarly(); // fake clients must be seated before selection closes (L6)
            Timers.CreateTimer(IsInToolsMode() ? 3 : 5, () => GameRules.FinishCustomGameSetup());
        }
        if (state === GameState.GAME_IN_PROGRESS) {
            this.grantStartingGold();
            this.e2e.start();
        }
    }

    private grantStartingGold(): void {
        for (let i = 0; i < 24; i++) {
            const pid = i as PlayerID;
            if (!PlayerResource.IsValidPlayerID(pid)) continue;
            PlayerResource.SetGold(pid, STARTING_GOLD, false);
        }
    }

    private onEntityKilled(event: EntityKilledEvent): void {
        const killed = EntIndexToHScript(event.entindex_killed) as CDOTA_BaseNPC | undefined;
        if (!killed || !killed.IsRealHero()) return;

        const attacker = EntIndexToHScript(event.entindex_attacker) as CDOTA_BaseNPC | undefined;
        if (!attacker) return;
        const killerTeam = attacker.GetTeamNumber();
        // No credit for a Pudge dying to his own Rot, or to an ally.
        if (killerTeam === killed.GetTeamNumber()) return;

        this.growFleshHeap(attacker);

        const { total, hasWon } = this.score.recordKill(killerTeam);
        if (total === 0) return; // post-win kills freeze at the first winner
        CustomNetTables.SetTableValue("pudge_wars_score", tostring(killerTeam), { kills: total });
        if (e2eEnabled()) print(Marker.killScored(killerTeam, total));

        if (hasWon) {
            GameRules.SetGameWinner(killerTeam);
            if (e2eEnabled()) print(Marker.win(killerTeam, total));
        }
    }

    /**
     * Add a Flesh Heap stack to the killer (spec 003). The stack count IS the
     * kill count; the modifier reads it for its HP/resist bonus, so we only bump
     * it and force a stat recompute here. Every hero is Pudge, so the passive is
     * always present — but guard anyway.
     */
    private growFleshHeap(attacker: CDOTA_BaseNPC): void {
        if (!attacker.IsRealHero()) return;
        const heap = attacker.FindModifierByName("modifier_pudge_flesh_heap");
        if (!heap) return;
        const stacks = heap.GetStackCount() + 1;
        heap.SetStackCount(stacks);
        (attacker as CDOTA_BaseNPC_Hero).CalculateStatBonus(true);
        if (e2eEnabled()) print(Marker.fleshStack(stacks, attacker.entindex()));
    }

    /** Called on `script_reload` in tools mode. */
    public Reload() {
        print("Script reloaded!");
    }
}
