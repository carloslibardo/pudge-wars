/**
 * Convar-gated headless end-to-end harness.
 *
 * This is what lets a machine with no human in front of it prove the game
 * actually works. Launch Dota in tools mode with `+pudge_wars_e2e 1`, and the
 * harness seats bots, drives them at each other until someone wins, and prints
 * `[E2E]` markers the VM rig greps out of `console.log` to issue a verdict.
 * See `testrig/` and playbook chapter 06.
 *
 * Convars:
 *   pudge_wars_e2e         1 engages the harness (default 0, tools mode only)
 *   pudge_wars_e2e_kills   win-threshold override, to keep runs bounded
 *
 * Every code path here is inert in a real match. That matters: the harness must
 * never be able to affect a game a human is playing.
 *
 * TWO WAYS TO SEAT BOTS — pick by mode, and never use `dota_bot_populate`,
 * which hard-crashes the tools client in a laneless FFA map (landmine L4):
 *
 *   - `dota_create_fake_clients` (used here) is CHEAT-GATED. It works in tools
 *     mode, where sv_cheats is on, and is SILENTLY IGNORED on a retail client —
 *     you get a log line, zero joins, and no error.
 *   - `GameRules.AddBotPlayerWithEntityScript` is the cheat-free API for
 *     filling a real lobby. It creates the hero itself, so it is seated at the
 *     horn rather than during setup.
 */
import { heroForPlayer } from "../lib/heroResolve";
import { firstHookTarget, hookDirection, type HookCandidate } from "../lib/hook";
import { teamForSeat } from "../lib/botTeams";
import { Marker } from "../lib/markers";

const MAX_PLAYER_SLOTS = 24;
const THINK_INTERVAL = 0.5;
/** Toggle Rot on when an enemy is at least this close. */
const ROT_TOGGLE_RANGE = 350;

export function e2eEnabled(): boolean {
    return IsInToolsMode() && (Convars.GetInt("pudge_wars_e2e") ?? 0) > 0;
}

/** The real win threshold, unless a smaller smoke-run override is set. */
export function e2eKillTarget(fallback: number): number {
    if (!e2eEnabled()) return fallback;
    const override = Convars.GetInt("pudge_wars_e2e_kills") ?? 0;
    return override > 0 ? override : fallback;
}

export class E2EHarness {
    private seated = false;
    private started = false;

    /**
     * Seat the fake clients during CUSTOM_GAME_SETUP — before hero selection
     * closes. Seated any later, they are rejected by CreateHeroForPlayer with
     * "bogus player id" and spend the match heroless (landmine L6).
     */
    public seatEarly(): void {
        if (this.seated || !e2eEnabled()) return;
        this.seated = true;
        print("[E2E] seating fake clients during setup");
        SendToServerConsole("dota_create_fake_clients");
        // Fake clients arrive with NO team. On archer-wars' 10-teams-of-one
        // FFA the engine auto-assigned each joiner to the next free team, but
        // on a two-team game they stay unassigned, sit out hero selection, and
        // SetCustomGameForceHero never touches them — nine seated bots, zero
        // heroes, zero kills (2026-07-26 VM smoke). Assign a balanced split
        // explicitly, one tick later so the seats exist, while the game is
        // still inside the CUSTOM_GAME_SETUP window.
        Timers.CreateTimer(0.5, () => {
            let seat = 0;
            const teams = [DotaTeam.GOODGUYS, DotaTeam.BADGUYS] as const;
            for (const id of this.bots()) {
                const team = teamForSeat(seat++, teams);
                PlayerResource.SetCustomTeamAssignment(id, team);
                print(Marker.botTeamAssigned(id, team));
            }
        });
    }

    /** Start the think loop once the match is actually live. */
    public start(): void {
        if (this.started || !e2eEnabled()) return;
        this.started = true;
        print("[E2E] harness engaged — driving bots");
        // Belt and braces under the team fix above: any fake client that still
        // came out of selection heroless gets a Pudge assigned directly. Safe
        // here because the bots were seated during setup — CreateHeroForPlayer
        // rejects only LATE-seated clients ("bogus player id"). SpawnPositions
        // teleports every hero onto its battle line at spawn, so no position
        // is needed, and the hero is already precached (GameMode.Precache).
        for (const id of this.bots()) {
            if (heroForPlayer(id)) continue;
            const player = PlayerResource.GetPlayer(id);
            if (!player) continue;
            CreateHeroForPlayer("npc_dota_hero_pudge", player);
            print(Marker.botHeroCreated(id));
        }
        // Perma-day. The day/night cycle renders night rounds near-black, which
        // makes every screenshot the rig captures worthless (landmine L15).
        Timers.CreateTimer(0, () => {
            GameRules.SetTimeOfDay(0.5);
            return 60;
        });
        Timers.CreateTimer(THINK_INTERVAL, () => this.think());
    }

    /** Player ids of the seated fake clients — never a human. */
    private bots(): PlayerID[] {
        const ids: PlayerID[] = [];
        for (let i = 0; i < MAX_PLAYER_SLOTS; i++) {
            const id = i as PlayerID;
            if (!PlayerResource.IsValidPlayerID(id)) continue;
            if (!PlayerResource.IsFakeClient(id)) continue;
            ids.push(id);
        }
        return ids;
    }

    private think(): number {
        for (const id of this.bots()) {
            // NOT PlayerResource.GetSelectedHeroEntity — it returns nil for
            // every bot, because bots get heroes ASSIGNED rather than selected
            // (landmine L5). heroForPlayer() walks all three fallbacks.
            const hero = heroForPlayer(id);
            if (!hero || hero.IsNull() || !hero.IsAlive()) continue;

            const enemies = this.enemyHeroesOf(hero);
            if (enemies.length === 0) continue;
            const target = this.nearest(hero, enemies);
            const origin = hero.GetAbsOrigin();
            const distance = ((target.GetAbsOrigin() - origin) as Vector).Length2D();

            // Toggle Rot (slot 1) on when an enemy is in range and it is off, so
            // hooked victims dragged into the cloud actually die and the run
            // reaches the win condition.
            const rot = hero.GetAbilityByIndex(1);
            if (rot && distance < ROT_TOGGLE_RANGE && !rot.GetToggleState() && rot.IsFullyCastable()) {
                ExecuteOrderFromTable({
                    UnitIndex: hero.entindex(),
                    OrderType: UnitOrder.CAST_TOGGLE,
                    AbilityIndex: rot.entindex(),
                    Queue: false,
                });
            }

            // Fire Meat Hook (slot 0) only when a straight hook at the nearest
            // enemy would actually connect — the SAME pure selection math the
            // engine's collision implements (lib/hook firstHookTarget). Aiming
            // this way makes the headless run reliably produce [HOOK] markers.
            const hook = hero.GetAbilityByIndex(0);
            if (hook && hook.IsFullyCastable()) {
                const [dx, dy] = hookDirection(
                    [origin.x, origin.y],
                    [target.GetAbsOrigin().x, target.GetAbsOrigin().y],
                );
                const range = hook.GetSpecialValueFor("hook_range");
                const width = hook.GetSpecialValueFor("hook_width");
                const candidates: HookCandidate[] = enemies.map(e => {
                    const p = e.GetAbsOrigin();
                    return { id: e.entindex(), pos: [p.x, p.y] };
                });
                if (firstHookTarget([origin.x, origin.y], [dx, dy], range, width, candidates) === target.entindex()) {
                    ExecuteOrderFromTable({
                        UnitIndex: hero.entindex(),
                        OrderType: UnitOrder.CAST_POSITION,
                        AbilityIndex: hook.entindex(),
                        Position: target.GetAbsOrigin(),
                        Queue: false,
                    });
                    continue;
                }
            }

            // Otherwise close the distance to line up a hook.
            ExecuteOrderFromTable({
                UnitIndex: hero.entindex(),
                OrderType: UnitOrder.MOVE_TO_POSITION,
                Position: target.GetAbsOrigin(),
                Queue: false,
            });
        }
        return THINK_INTERVAL;
    }

    private enemyHeroesOf(hero: CDOTA_BaseNPC_Hero): CDOTA_BaseNPC_Hero[] {
        const enemies: CDOTA_BaseNPC_Hero[] = [];
        const count = HeroList.GetHeroCount();
        for (let i = 0; i < count; i++) {
            const other = HeroList.GetHero(i);
            if (!other || other.IsNull() || !other.IsAlive()) continue;
            if (other.GetTeamNumber() === hero.GetTeamNumber()) continue;
            enemies.push(other);
        }
        return enemies;
    }

    private nearest(hero: CDOTA_BaseNPC_Hero, enemies: CDOTA_BaseNPC_Hero[]): CDOTA_BaseNPC_Hero {
        let best = enemies[0];
        let bestDistance = ((best.GetAbsOrigin() - hero.GetAbsOrigin()) as Vector).Length2D();
        for (const other of enemies) {
            const distance = ((other.GetAbsOrigin() - hero.GetAbsOrigin()) as Vector).Length2D();
            if (distance < bestDistance) {
                bestDistance = distance;
                best = other;
            }
        }
        return best;
    }
}
