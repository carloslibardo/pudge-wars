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
import { sideForTeam } from "../lib/battleLines";
import { teamForSeat } from "../lib/botTeams";
import { nextAbilitySlot } from "../lib/botSkillPlan";
import { nextPurchase } from "../lib/botShopping";
import { Marker } from "../lib/markers";
import { modifier_pudge_wars_rot } from "../modifiers/modifier_pudge_wars_rot";
import { e2eEnabled, e2eKillTarget } from "./e2eFlags";

export { e2eEnabled, e2eKillTarget };

const MAX_PLAYER_SLOTS = 24;
const THINK_INTERVAL = 0.5;
/** Toggle Rot on when an enemy is at least this close. */
const ROT_TOGGLE_RANGE = 350;
/** Where a bot holds: its own river bank (river 400 + margin), never across. */
const BANK_HOLD_X = 450;
/** Y range a bot will slide along its bank while mirroring its target. */
const BANK_HOLD_Y_MAX = 1000;

export class E2EHarness {
    private seated = false;
    private started = false;
    /** Per-bot item counts, mirroring lib/shop's PurchaseState.owned. */
    private owned: Partial<Record<number, Record<string, number>>> = {};

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
        // Boost every bot to level 4 (1300 XP; the L3 curve step is 640, so
        // 600 bought only two points in run 7) — all three abilities hit
        // level 1 at the horn, hook gets its second point. On the stock map
        // XP trickles in so slowly that Flesh Heap's first point landed at
        // ~t+5min (run 6) — after most of the run's kills — and the [FLESH]
        // gate could only pass by luck. The smoke tests the ability systems,
        // not the XP curve.
        Timers.CreateTimer(1, () => {
            for (const id of this.bots()) {
                const hero = heroForPlayer(id);
                if (hero && !hero.IsNull()) {
                    hero.AddExperience(1300, ModifyXpReason.UNSPECIFIED, false, true, 0);
                }
            }
        });
        // Camera tripod (e2e only): the rig launches with +dota_camera_lock 1,
        // which follows the HOST's hero — park that hero mid-river as an
        // invisible, invulnerable tripod so the locked camera frames both
        // banks and every hook crossing. Engine-convar lock is the ONE
        // camera technique that reliably moves the tools client in a match
        // recording (archer-wars frame audits 2026-07-09/11/14: both the
        // server SetCameraTarget and the client GameUI routes stayed parked).
        Timers.CreateTimer(2, () => {
            const host = heroForPlayer(0 as PlayerID);
            if (!host || host.IsNull()) return;
            host.AddNewModifier(host, undefined, "modifier_invulnerable", {});
            host.AddNoDraw();
            FindClearSpaceForUnit(host, GetGroundPosition(Vector(0, 0, 0), host), true);
            host.Stop();
        });
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

    /**
     * Spend the bot's ability points. Nothing else in the game levels bot
     * abilities — a fresh hero holds its point forever, the hook sits at
     * level 0, IsFullyCastable() is never true, and the bots just walk into
     * each other for the whole run (2026-07-26 smoke #2: nine live Pudges,
     * river buffs flowing, zero [HOOK] lines). Points are SPREAD
     * lowest-level-first (lib/botSkillPlan): the first version leveled by
     * slot order, maxed the hook, and Rot never left level 0 — an entire
     * ability shipped with zero tier-2 evidence (run 4: 0 [ROT] ticks).
     * Runs every think so respawns and XP levels get spent too. e2e bots
     * only — a real player levels their own hook.
     */
    private levelAbilities(id: PlayerID, hero: CDOTA_BaseNPC_Hero): void {
        let guard = 8; // points per think, bounded
        while (hero.GetAbilityPoints() > 0 && guard-- > 0) {
            const slots = [0, 1, 2].map(i => hero.GetAbilityByIndex(i));
            const pick = nextAbilitySlot(
                slots.map(a => (a ? a.GetLevel() : 0)),
                slots.map(a => (a ? a.GetMaxLevel() : 0)),
            );
            if (pick === undefined) return; // everything maxed
            const ability = slots[pick]!;
            hero.UpgradeAbility(ability);
            print(Marker.botAbilityLeveled(id, ability.GetAbilityName(), ability.GetLevel()));
        }
    }

    /**
     * Spend the bot's gold in the shop, one item per think.
     *
     * Fake clients have no game client, so the NATIVE shop path (client UI →
     * purchase order → `dota_item_purchased` event) can never fire for them.
     * Instead the pick runs through the same pure `purchase()` catalog rule
     * (cost + stack caps, lib/botShopping), the grant/charge mirrors a real
     * transaction (grant first — AddItemByName returns nil on a full
     * inventory, and charging anyway would silently burn the gold), and the
     * harness prints the [SHOP] marker itself. GameMode's event listener
     * still covers real-player buys.
     */
    private shop(id: PlayerID, hero: CDOTA_BaseNPC_Hero): void {
        let owned = this.owned[id];
        if (!owned) {
            owned = {};
            this.owned[id] = owned;
        }
        const pick = nextPurchase({ gold: PlayerResource.GetGold(id), owned }, id);
        if (!pick) return;
        const granted = hero.AddItemByName(pick.item.name);
        if (!granted || granted.IsNull()) return; // no free slot; retry next think
        PlayerResource.SpendGold(id, pick.item.cost, ModifyGoldReason.PURCHASE_ITEM);
        owned[pick.item.name] = (owned[pick.item.name] ?? 0) + 1;
        print(Marker.itemPurchased(pick.item.name, id));
    }

    private think(): number {
        for (const id of this.bots()) {
            // NOT PlayerResource.GetSelectedHeroEntity — it returns nil for
            // every bot, because bots get heroes ASSIGNED rather than selected
            // (landmine L5). heroForPlayer() walks all three fallbacks.
            const hero = heroForPlayer(id);
            if (!hero || hero.IsNull() || !hero.IsAlive()) continue;
            this.levelAbilities(id, hero);
            this.shop(id, hero);

            const enemies = this.enemyHeroesOf(hero);
            if (enemies.length === 0) continue;
            const target = this.nearest(hero, enemies);
            const origin = hero.GetAbsOrigin();
            const distance = ((target.GetAbsOrigin() - origin) as Vector).Length2D();

            // Rot when an enemy is close, so hooked victims dragged into the
            // cloud actually die. Fake clients cannot drive the toggle
            // plumbing at all: a CAST_TOGGLE order gets clobbered by the same
            // think's Queue:false move/cast order (run 5), ToggleAbility() is
            // a silent no-op on an ability_lua toggle from server script
            // (run 6), and AddNewModifier-by-name silently created nothing
            // (run 7) — zero [ROT] ticks all three times. So call the
            // registered class's own apply(), the EXACT call pudge_rot's
            // OnToggle makes for a human toggle (importing the class here is
            // why e2eEnabled moved to e2eFlags — it was an import cycle).
            // What the smoke must exercise is the modifier itself — tick
            // damage, slow, clamped self-damage; the toggle switch stays a
            // human-playtest item.
            const rot = hero.GetAbilityByIndex(1);
            if (rot && rot.GetLevel() > 0) {
                const rotOn = hero.HasModifier("modifier_pudge_wars_rot");
                if (distance < ROT_TOGGLE_RANGE && !rotOn) {
                    modifier_pudge_wars_rot.apply(hero, hero, rot, { duration: -1 });
                    print(
                        `[E2E] rot applied to bot ${id} dist ${Math.floor(distance)} ok ${hero.HasModifier("modifier_pudge_wars_rot")}`,
                    );
                } else if (distance >= ROT_TOGGLE_RANGE * 2 && rotOn) {
                    hero.RemoveModifierByName("modifier_pudge_wars_rot");
                }
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

            // Otherwise hold the own bank, sliding along Y to mirror the
            // target — the traditional Pudge Wars duel: two lines of Pudges
            // trading hooks across the river, never walking into it. (The
            // old executor chased the nearest enemy into a mid-river melee
            // scrum — run 11's video showed a brawl, not a hook war. The
            // side-lock order filter would clamp a chase anyway; this aims
            // the bot at the right place to begin with.)
            const side = sideForTeam(hero.GetTeamNumber()) ?? -1;
            const holdY = Math.max(
                -BANK_HOLD_Y_MAX,
                Math.min(BANK_HOLD_Y_MAX, target.GetAbsOrigin().y),
            );
            ExecuteOrderFromTable({
                UnitIndex: hero.entindex(),
                OrderType: UnitOrder.MOVE_TO_POSITION,
                Position: GetGroundPosition(Vector(side * BANK_HOLD_X, holdY, 0), hero),
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
            // Bots fight bots: the host's hero is the invisible camera tripod
            // parked mid-river, not a target — without this the whole enemy
            // team hooks at an invulnerable ghost all match.
            if (!PlayerResource.IsFakeClient(other.GetPlayerOwnerID())) continue;
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
