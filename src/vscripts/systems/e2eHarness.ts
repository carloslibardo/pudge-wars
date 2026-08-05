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
import { onWrongSide } from "../lib/sideLock";
import { teamForSeat } from "../lib/botTeams";
import { nextAbilitySlot } from "../lib/botSkillPlan";
import { nextPurchase } from "../lib/botShopping";
import { anchorY } from "../lib/botFormation";
import { addTravel, isStuck, AUDIT_WINDOW_THINKS, STUCK_THRESHOLD } from "../lib/motionLiveness";
import { driftLeadY, giftHunter } from "../lib/riverGift";
import { isInRiver } from "../lib/river";
import { activeThreats, dodgeStep, incomingThreat } from "../lib/hookThreats";
import {
    dodgeRoll,
    estimateVelocity,
    interceptPoint,
    mulberry32,
    personaFor,
    personaStrafe,
    pickTarget,
    retreatState,
    RETREAT_DEPTH,
    RETREAT_EXIT_HP_PCT,
    RETREAT_HP_PCT,
    type TargetCandidate,
} from "../lib/botTactics";
import { holdThinks, reachedWaypoint, roamMood, roamWaypoint, type RoamBounds } from "../lib/botRoam";
import { Marker } from "../lib/markers";
import { GIFT_HUNT_DELAY, RIVER_BAND, SPAWN_SPACING } from "../config";
import { modifier_pudge_wars_rot } from "../modifiers/modifier_pudge_wars_rot";
import { RiverGiftSystem } from "./riverGifts";
import { ShopPads } from "./shopPads";
import { e2eEnabled, e2eKillTarget } from "./e2eFlags";

export { e2eEnabled, e2eKillTarget };

const MAX_PLAYER_SLOTS = 24;
const THINK_INTERVAL = 0.5;
/** Toggle Rot on when an enemy is at least this close. 500 since run 16:
 *  swarmers flipped Rot on too late for the burst to land inside the catch
 *  window (7 kills in 900s). */
const ROT_TOGGLE_RANGE = 500;
/** Where a bot holds: its own river bank (river 400 + margin), never across. */
const BANK_HOLD_X = 450;
/** A caught enemy within this range pulls the whole team onto it (spec 007). */
const SWARM_RANGE = 1500;
/** Roam area (spec 012): own bank to deep field — bounded to the ZOOMED
 *  camera's view (run 24: waypoints at 2400/2000 roamed off-screen and the
 *  video read as an empty map). */
// maxX tracks the halved court (arena halfWidth 2150, spawn line 1500).
const ROAM_BOUNDS: RoamBounds = { bankX: BANK_HOLD_X, maxX: 1150, maxY: 1300 };
/** Meteor slam range — item cast range 1200 with a safety margin. */
const METEOR_RANGE = 1100;
/** Hazard liveness probe (spec 012): bots CANNOT walk into the river (the
 *  side-lock order filter clamps every move), so the burn would sit dormant
 *  in a healthy run and its gate could never pass. At this tick one bot is
 *  TELEPORTED mid-river and held for the window — long enough to burn on
 *  camera (grace 4 s), short enough to escape the 6 s river sweep. */
const HAZARD_PROBE_TICK = 240;
// 14 thinks = 7 s: grace is 4 s, so a surviving probe burns ~3 s on camera
// (10 thinks left only ~1 s of dps — one marker race away from a miss).
const HAZARD_PROBE_THINKS = 14;

export class E2EHarness {
    private seated = false;
    private started = false;
    /** Per-bot item counts, mirroring lib/shop's PurchaseState.owned. */
    private owned: Partial<Record<number, Record<string, number>>> = {};
    /** Think counter — the time source for strafing and the liveness windows. */
    private tick = 0;
    // Strictly alternates the two dodge actions across the whole match. Tick
    // parity looked equivalent and is not: dodge events cluster in the same
    // few ticks of a hook volley, so a whole match can land on one phase.
    private dodgeCount = 0;
    /** Per-bot travel accumulated this liveness window (spec 007). */
    private travel: Partial<Record<number, number>> = {};
    private prevPos: Partial<Record<number, [number, number]>> = {};
    /** Thinks this window the bot was alive — dead bots are not audited. */
    private aliveThinks: Partial<Record<number, number>> = {};
    /** Tick a bot was first seen inside the river band (spec 008 lingering). */
    private riverSince: Partial<Record<number, number>> = {};
    /** Velocity per bot, estimated each think (spec 009 intercept aim). */
    private velocity: Partial<Record<number, [number, number]>> = {};
    /** Current target entindex per bot (archer stickiness). */
    private targetOf: Partial<Record<number, number>> = {};
    /** Last tick a hook cast order was issued (archer castHold: 1 s). */
    private lastCastTick: Partial<Record<number, number>> = {};
    /** Whether the bot is currently in a retreat episode (marker throttle). */
    private retreating: Partial<Record<number, boolean>> = {};
    /** Position snapshot every 4 thinks — the no-op-move watchdog probe. */
    private probePos: Partial<Record<number, [number, number]>> = {};
    /** Consecutive no-op nudges — 3 escalates to an anchor relocation. */
    private unstickStreak: Partial<Record<number, number>> = {};
    /** Roam state (spec 012): current waypoint, forced-repick tick, seeded rng. */
    private roamWp: Partial<Record<number, [number, number]>> = {};
    private roamRepickAt: Partial<Record<number, number>> = {};
    private roamRng: Partial<Record<number, () => number>> = {};
    private roamTotal = 0;
    /** Shop trip phase per bot (spec 013). */
    private tripPhase: Partial<Record<number, "none" | "going" | "buying">> = {};
    /** Chests whose dwell-ok marker already printed (spec 014). */
    private dwellPrinted = new Set<EntityIndex>();
    /** HP-opportunity telemetry episodes (run 35). */
    private hpLowPrinted: Partial<Record<number, boolean>> = {};
    private hpCritPrinted: Partial<Record<number, boolean>> = {};
    /** Hazard probe state (spec 012). */
    private probeBot: PlayerID | undefined;
    private probeStartTick = 0;
    private probeDone = false;

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
                // The HOST levels the honest way (2026-08-03 field report):
                // the camera is on its HUD, and a level-9 loadout at the horn
                // reads as a broken game. Kills feed it XP; levelAbilities
                // spends the points on camera as they arrive.
                if (id === 0) continue;
                const hero = heroForPlayer(id);
                if (hero && !hero.IsNull()) {
                    // 6500 XP ≈ level 9: one point in all six abilities plus
                    // hook/rot/flesh L2. Runs 15-18: the three spec-010 skills
                    // diluted the lowest-first spread and L1 combat abilities
                    // could not close a 10-kill match inside the window.
                    hero.AddExperience(6500, ModifyXpReason.UNSPECIFIED, false, true, 0);
                }
            }
        });
        // Camera (e2e only): the rig launches with +dota_camera_lock 1, which
        // follows the HOST's hero. 2026-08-03 field report: that hero is no
        // longer an invisible tripod parked mid-river — it PLAYS (same AI as
        // the fake clients), so the locked camera gives a centered
        // player's-POV follow shot for free. Engine-convar lock remains the
        // ONE camera technique that reliably moves the tools client in a
        // match recording (archer-wars frame audits 2026-07-09/11/14: both
        // server SetCameraTarget and the client GameUI routes stayed parked).
        //
        // Zoom the locked camera so the action around the star is on frame
        // ±1900, lurk roamers, gift spawns). The `+dota_camera_distance`
        // launch convar is CHEAT-GATED and silently ignored (run 26: frames
        // identical to default zoom); the server-side game-mode override is
        // the reliable route — e2e only, real matches keep stock camera.
        // 2000 after the width halve (was 2400 for the 8600-wide court).
        GameRules.GetGameModeEntity().SetCameraDistanceOverride(2000);
        // Perma-day. The day/night cycle renders night rounds near-black, which
        // makes every screenshot the rig captures worthless (landmine L15).
        Timers.CreateTimer(0, () => {
            GameRules.SetTimeOfDay(0.5);
            return 60;
        });
        Timers.CreateTimer(THINK_INTERVAL, () => this.think());
    }

    /** Player ids the harness drives: the seated fake clients PLUS the host.
     *  2026-08-03 field report: the host's hero is no longer a parked camera
     *  tripod — it is a real combatant the locked camera follows, so the
     *  same AI drives it and its HUD shows earned levels and bought items. */
    private bots(): PlayerID[] {
        const ids: PlayerID[] = [];
        for (let i = 0; i < MAX_PLAYER_SLOTS; i++) {
            const id = i as PlayerID;
            if (!PlayerResource.IsValidPlayerID(id)) continue;
            if (id !== 0 && !PlayerResource.IsFakeClient(id)) continue;
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
            const slots = [0, 1, 2, 3, 4, 5].map(i => hero.GetAbilityByIndex(i));
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
        // A buy must be SEEN, not just logged (spec 005 visibility rev): the
        // gold-cost popup over the buyer's head is what the frame reviewer
        // looks for at each [SHOP] timestamp.
        SendOverheadEventMessage(undefined, OverheadAlert.GOLD, hero, pick.item.cost, undefined);
        EmitSoundOn("Item.PickUpShop", hero);
    }

    /**
     * Spec 007 liveness + inventory audit, printed once per window. Only bots
     * alive for ≥80% of the window are motion-audited — death + respawn wait
     * would read as travel 0 and fake a STUCK.
     */
    private audit(bots: PlayerID[]): void {
        let withItems = 0;
        let total = 0;
        for (const id of bots) {
            const hero = heroForPlayer(id);
            if (!hero || hero.IsNull()) continue;
            total++;
            let holds = false;
            for (let slot = 0; slot < 9; slot++) {
                if (hero.GetItemInSlot(slot as InventorySlot) !== undefined) {
                    holds = true;
                    break;
                }
            }
            if (holds) withItems++;

            const travelled = this.travel[id] ?? 0;
            const alive = this.aliveThinks[id] ?? 0;
            if (alive >= AUDIT_WINDOW_THINKS * 0.8) {
                print(Marker.motionAudit(id, Math.floor(travelled), AUDIT_WINDOW_THINKS * THINK_INTERVAL));
                if (isStuck(travelled, STUCK_THRESHOLD)) print(Marker.motionStuck(id));
            }
            this.travel[id] = 0;
            this.aliveThinks[id] = 0;
        }
        print(Marker.shopAudit(withItems, total));

        // Spec 008: nobody may treat the river as a resting state. Grace is
        // 16 thinks (8 s) — same as the stranded sweep.
        let lingerers = 0;
        for (const id of bots) {
            const since = this.riverSince[id];
            if (since !== undefined && this.tick - since > 16) lingerers++;
        }
        print(Marker.riverLingerers(lingerers));
    }

    private think(): number {
        this.tick++;
        const bots = this.bots();

        // Team rosters (stable, seat-ordered) drive per-slot formation anchors
        // (spec 007) and per-team gift hunting (spec 006).
        const rosters = new Map<number, PlayerID[]>();
        for (const id of bots) {
            const team = PlayerResource.GetTeam(id);
            const roster = rosters.get(team) ?? [];
            roster.push(id);
            rosters.set(team, roster);
        }
        const gift = RiverGiftSystem.currentGift();
        const hunters = new Set<PlayerID>();
        if (gift) {
            const giftY = gift.GetAbsOrigin().y;
            for (const roster of rosters.values()) {
                const alive = roster.filter(id => {
                    const h = heroForPlayer(id);
                    return h !== undefined && !h.IsNull() && h.IsAlive();
                });
                const pick = giftHunter(
                    alive.map(id => heroForPlayer(id)!.GetAbsOrigin().y),
                    giftY,
                );
                if (pick !== undefined) hunters.add(alive[pick]);
            }
        }

        // Sampling pass BEFORE decisions: velocity (intercept aim reads a
        // consistent 0.5 s-old sample for every hero regardless of seat
        // order), travel liveness, and river-linger tracking (spec 008).
        const now = GameRules.GetGameTime();
        for (const id of bots) {
            const hero = heroForPlayer(id);
            if (!hero || hero.IsNull() || !hero.IsAlive()) {
                // A bot that DIED in the river must not haunt the linger audit
                // (run 15: a corpse's stale stamp read as `lingerers 1`), and
                // stale velocity must not lead hooks at a respawned ghost.
                delete this.riverSince[id];
                delete this.velocity[id];
                delete this.probePos[id];
                continue;
            }
            const p: [number, number] = [hero.GetAbsOrigin().x, hero.GetAbsOrigin().y];
            // Archer huntNav watchdog: an unpathable or body-blocked move
            // order silently NO-OPS and freezes the bot (run 16: two bots at
            // travel 0 for whole windows while ordered every think). Under 50
            // units of progress across 2 s → nudge free onto the own bank.
            if (this.tick % 4 === 0) {
                const probe = id === this.probeBot ? undefined : this.probePos[id];
                if (probe) {
                    const dx = p[0] - probe[0];
                    const dy = p[1] - probe[1];
                    if (Math.sqrt(dx * dx + dy * dy) < 50) {
                        const side = sideForTeam(hero.GetTeamNumber()) ?? -1;
                        // Escalate on the 3rd consecutive no-op: a nudge to
                        // the CURRENT spot is itself a no-op when the bot
                        // already stands in clear space (run 19: 188 nudges,
                        // 269 units) — relocate to the formation anchor,
                        // which is guaranteed to be a different place.
                        this.unstickStreak[id] = (this.unstickStreak[id] ?? 0) + 1;
                        let ty = p[1];
                        if ((this.unstickStreak[id] ?? 0) >= 3) {
                            const roster = rosters.get(hero.GetTeamNumber()) ?? [id];
                            const anchor = anchorY(Math.max(0, roster.indexOf(id)), roster.length, SPAWN_SPACING);
                            ty = Math.abs(p[1] - anchor) < 200 ? anchor + 400 : anchor;
                            this.unstickStreak[id] = 0;
                        }
                        FindClearSpaceForUnit(
                            hero,
                            GetGroundPosition(Vector(side * BANK_HOLD_X, ty, 0), hero),
                            true,
                        );
                        print(`[MOTION] unstick bot ${id}`);
                    } else {
                        this.unstickStreak[id] = 0;
                    }
                }
                this.probePos[id] = p;
            }
            this.velocity[id] = estimateVelocity(this.prevPos[id], p, THINK_INTERVAL);
            this.travel[id] = addTravel(this.travel[id] ?? 0, this.prevPos[id], p);
            this.prevPos[id] = p;
            this.aliveThinks[id] = (this.aliveThinks[id] ?? 0) + 1;
            if (isInRiver(p[0], p[1], RIVER_BAND)) {
                if (this.riverSince[id] === undefined) this.riverSince[id] = this.tick;
            } else {
                delete this.riverSince[id];
            }
        }
        const threats = activeThreats(now);

        // Hazard liveness probe (spec 012): plant one bot mid-river, let it
        // burn on camera, release it before the sweep would wash it.
        if (!this.probeDone && this.probeBot === undefined && this.tick >= HAZARD_PROBE_TICK) {
            for (const id of bots) {
                // Never the host: it is the camera's star (2026-08-03) — a
                // stationary burn mid-river is bad footage and a free hook.
                if (id === 0) continue;
                const h = heroForPlayer(id);
                if (!h || h.IsNull() || !h.IsAlive() || h.IsCurrentlyHorizontalMotionControlled()) continue;
                const y = Math.max(-1000, Math.min(1000, h.GetAbsOrigin().y));
                FindClearSpaceForUnit(h, GetGroundPosition(Vector(0, y, 0), h), true);
                h.Stop();
                this.probeBot = id;
                this.probeStartTick = this.tick;
                print(`[E2E] hazard probe start bot ${id}`);
                break;
            }
        }
        if (this.probeBot !== undefined) {
            const ph = heroForPlayer(this.probeBot);
            if (!ph || ph.IsNull() || !ph.IsAlive()) {
                // Run 35: a stationary mid-river bot is a free target for a
                // 2400-speed lethal hook — the probe died in <2 s with zero
                // hazard exposure. Retry with the next candidate.
                print(`[E2E] hazard probe bot ${this.probeBot} died — retrying`);
                this.probeBot = undefined;
            } else if (this.tick - this.probeStartTick >= HAZARD_PROBE_THINKS) {
                print(`[E2E] hazard probe end bot ${this.probeBot}`);
                this.probeBot = undefined;
                this.probeDone = true;
            }
        }

        for (const id of bots) {
            // NOT PlayerResource.GetSelectedHeroEntity — it returns nil for
            // every bot, because bots get heroes ASSIGNED rather than selected
            // (landmine L5). heroForPlayer() walks all three fallbacks.
            const hero = heroForPlayer(id);
            if (!hero || hero.IsNull() || !hero.IsAlive()) continue;
            // The probe bot STANDS in the water, burning — no decisions
            // (especially not river egress) until the window closes.
            if (id === this.probeBot) continue;
            this.levelAbilities(id, hero);
            // Buying happens ON THE PAD now (spec 013) — see the trip branch.

            const origin = hero.GetAbsOrigin();
            const hook = hero.GetAbilityByIndex(0);
            const side = sideForTeam(hero.GetTeamNumber()) ?? -1;
            const enemies = this.enemyHeroesOf(hero);

            // Target via the archer scoring — wounded beats near, finisher
            // bonus at ≤25%, stickiness to the current target (spec 009) —
            // instead of run 14's plain nearest.
            let target: CDOTA_BaseNPC_Hero | undefined;
            if (enemies.length > 0) {
                const candidates: TargetCandidate[] = enemies.map(e => {
                    const ep = e.GetAbsOrigin();
                    return { id: e.entindex(), pos: [ep.x, ep.y] as const, hpPct: e.GetHealthPercent() / 100 };
                });
                const picked = pickTarget([origin.x, origin.y], candidates, this.targetOf[id]);
                if (picked !== undefined) this.targetOf[id] = picked;
                target = enemies.find(e => e.entindex() === picked) ?? enemies[0];
            }
            const distance = target
                ? ((target.GetAbsOrigin() - origin) as Vector).Length2D()
                : 99999;

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

            // 1) RIVER EGRESS (spec 008): the water is never a resting state.
            // A bot standing in the band (and not mid-drag) leaves NOW, before
            // any other decision can strand it there.
            if (isInRiver(origin.x, origin.y, RIVER_BAND) && !hero.IsCurrentlyHorizontalMotionControlled()) {
                this.move(hero, side * BANK_HOLD_X, origin.y);
                continue;
            }

            // 2) DODGE reflex (spec 009): sidestep an inbound enemy hook —
            // or Vanish out of it when the own hook is down anyway.
            const threat = incomingThreat([origin.x, origin.y], hero.GetTeamNumber(), threats, now);
            if (threat && dodgeRoll(id, this.tick)) {
                // Two dodge actions, strictly alternating, sidestep first. A
                // 25-kill match only surfaces a handful of dodge events (run
                // 40: 6, run 41: 4) at 2400 hook speed, so any probabilistic
                // split can shut one branch out for a whole match — run 41
                // gated on "own hook down OR even tick", and with 129 hooks
                // fired the own-hook-down clause was true nearly always: 4
                // dodges, 4 vanishes, zero sidesteps.
                const vanish = hero.GetAbilityByIndex(3);
                const takeVanish = this.dodgeCount % 2 === 1;
                this.dodgeCount += 1;
                if (vanish && vanish.IsFullyCastable() && takeVanish) {
                    hero.CastAbilityNoTarget(vanish, id);
                    // The reflex layer fired — say so on the vanish branch too.
                    // Run 41 printed nothing here, so a live reflex layer that
                    // happened to prefer vanish read to the gate as dead code.
                    print(Marker.dodgeVanish(id));
                } else {
                    const [ex, ey] = dodgeStep([origin.x, origin.y], threat);
                    this.move(hero, ex, ey); // side-lock clamps the step to our bank
                    print(Marker.dodgeSidestep(id));
                }
                continue;
            }

            const hpPct = hero.GetHealthPercent() / 100;

            // HP-opportunity telemetry (run 35): lethal hooks made damage
            // bimodal — full or dead — so low-HP states are rare and the
            // retreat / iron-gut smoke gates went conditional on these
            // markers. Printed once per episode, at the same thresholds the
            // behaviors themselves use, so "opportunity without behavior"
            // reads as a real failure and "no opportunity" as a vacuous pass.
            if (hpPct < RETREAT_HP_PCT && enemies.length > 0) {
                if (!this.hpLowPrinted[id]) {
                    this.hpLowPrinted[id] = true;
                    print(Marker.hpLow(id, Math.floor(hpPct * 100)));
                }
            } else if (hpPct > RETREAT_EXIT_HP_PCT) {
                this.hpLowPrinted[id] = false;
            }

            // 3) IRON GUT panic button (spec 010): the pack is closing.
            const gut = hero.GetAbilityByIndex(4);
            if (gut && gut.IsFullyCastable() && hpPct < 0.25 && distance < 900) {
                if (!this.hpCritPrinted[id]) {
                    this.hpCritPrinted[id] = true;
                    print(Marker.hpCritical(id, Math.floor(hpPct * 100)));
                }
                hero.CastAbilityNoTarget(gut, id);
                continue;
            }
            if (hpPct > 0.5) this.hpCritPrinted[id] = false;

            // 4) RETREAT (spec 009): break off deep into the own field, Sprint
            // if it's up. HYSTERESIS (run 15): enter under 35%, rejoin only
            // past 55% — the flapping band camped bots at the entry line with
            // zero travel (STUCK). While retreating, strafe on the persona at
            // depth so the liveness gate still sees motion. Marker prints once
            // per episode, not per think.
            const inRetreat = retreatState(this.retreating[id] === true, hpPct, enemies.length > 0);
            if (inRetreat) {
                if (!this.retreating[id]) {
                    this.retreating[id] = true;
                    print(Marker.retreat(id, Math.floor(hpPct * 100)));
                }
                const sprint = hero.GetAbilityByIndex(5);
                if (sprint && sprint.IsFullyCastable()) hero.CastAbilityNoTarget(sprint, id);
                const deepY = origin.y + personaStrafe(this.tick, personaFor(id)) * 2;
                this.move(hero, side * (BANK_HOLD_X + RETREAT_DEPTH), deepY);
                continue;
            }
            this.retreating[id] = false;

            // 5) SHOP TRIP (spec 013): gold burning a hole in the pocket →
            // physically walk to the home pad, buy there, walk back. Yields to
            // everything above (egress/dodge/panic/retreat keep their priority).
            if (this.wantsPurchase(id)) {
                const phase = this.tripPhase[id] ?? "none";
                if (ShopPads.onPad(hero)) {
                    if (phase !== "buying") {
                        this.tripPhase[id] = "buying";
                        print(Marker.shopTripArrive(id));
                    }
                    this.shop(id, hero);
                    continue; // stand on the pad while the purchase lands
                }
                if (phase !== "going") {
                    this.tripPhase[id] = "going";
                    print(Marker.shopTripStart(id, PlayerResource.GetGold(id)));
                }
                const pad = ShopPads.padFor(hero.GetTeamNumber());
                if (pad) {
                    this.move(hero, pad.x, pad.y + personaStrafe(this.tick, personaFor(id)));
                    continue;
                }
            } else {
                this.tripPhase[id] = "none";
            }

            // 6) Gift hunting (spec 006), RANGE-GATED (spec 008) and now
            // DWELL-GATED (spec 014): the chest must sit visibly on the water
            // ≥6 s before a bot may snipe it — line up on the bank meanwhile.
            const giftAge = RiverGiftSystem.age();
            if (gift && hunters.has(id) && hook && giftAge !== undefined) {
                const gp = gift.GetAbsOrigin();
                const gdist = ((gp - origin) as Vector).Length2D();
                const range = hook.GetSpecialValueFor("hook_range") * 0.95;
                if (
                    giftAge >= GIFT_HUNT_DELAY &&
                    hook.IsFullyCastable() &&
                    gdist <= range &&
                    this.canCast(id)
                ) {
                    if (!this.dwellPrinted.has(gift.entindex())) {
                        this.dwellPrinted.add(gift.entindex());
                        print(Marker.giftDwellOk(Math.floor(giftAge)));
                    }
                    // Spec 014 rev 2: the chest drifts — aim where it will be
                    // when the hook arrives, not where it is.
                    const aimY = driftLeadY(
                        gp.y,
                        RiverGiftSystem.driftVelocityY(),
                        gdist,
                        hook.GetSpecialValueFor("hook_speed"),
                    );
                    this.castHookAt(hero, hook, Vector(gp.x, aimY, gp.z), id);
                    continue;
                }
                // Waiting out the dwell, out of range, or hook down: slide
                // along the OWN bank to the chest's Y, strafing (a hunter
                // parked exactly there read as frozen to the watchdog, run 18).
                this.move(hero, side * BANK_HOLD_X, gp.y + personaStrafe(this.tick, personaFor(id)));
                continue;
            }

            if (target) {
                // 7) Swarm the catch (spec 007 rev): a hooked enemy on OUR
                // field is the team's kill window — Meteor it (spec 013),
                // Sprint in, re-hook it deeper (run 13: a lone rot never
                // finishes).
                const targetSide = sideForTeam(target.GetTeamNumber());
                const intruder =
                    targetSide !== undefined &&
                    onWrongSide(targetSide, target.GetAbsOrigin().x, RIVER_BAND.max) &&
                    distance < SWARM_RANGE;
                // METEOR (spec 013, rev 2026-08-02) — never at a mid-drag
                // victim (it moves ~900 units during the fall delay:
                // guaranteed miss); lead a walking one by its sampled velocity
                // over the delay. No longer intruder-gated: lethal drags mean
                // a hooked enemy dies on arrival, so intruders stopped
                // existing and the meteor is now a cross-river poke.
                const meteor = this.findMeteor(hero);
                if (
                    meteor &&
                    meteor.IsFullyCastable() &&
                    distance <= METEOR_RANGE &&
                    !target.HasModifier("modifier_pudge_hook_drag")
                ) {
                    const delay = meteor.GetSpecialValueFor("delay");
                    const vel = this.velocity[target.GetPlayerOwnerID()] ?? [0, 0];
                    const tp = target.GetAbsOrigin();
                    ExecuteOrderFromTable({
                        UnitIndex: hero.entindex(),
                        OrderType: UnitOrder.CAST_POSITION,
                        AbilityIndex: meteor.entindex(),
                        Position: GetGroundPosition(
                            Vector(tp.x + vel[0] * delay, tp.y + vel[1] * delay, 0),
                            hero,
                        ),
                        Queue: false,
                    });
                    continue;
                }
                if (intruder) {
                    const sprint = hero.GetAbilityByIndex(5);
                    if (sprint && sprint.IsFullyCastable()) hero.CastAbilityNoTarget(sprint, id);
                    const range = hook ? hook.GetSpecialValueFor("hook_range") * 0.95 : 0;
                    if (
                        hook &&
                        hook.IsFullyCastable() &&
                        distance <= range &&
                        this.canCast(id) &&
                        !target.HasModifier("modifier_pudge_hook_drag")
                    ) {
                        this.castHookAt(hero, hook, target.GetAbsOrigin(), id);
                    } else {
                        // ORBIT the catch, don't stand on it: move-to-target at
                        // point blank is a zero-displacement order — run 17's
                        // "stuck" bots were swarmers grinding on top of their
                        // victim (hooks at dist 66, travel 0).
                        const tp = target.GetAbsOrigin();
                        const orbit = (this.tick % 4 < 2 ? 1 : -1) * 150;
                        this.move(hero, tp.x, tp.y + orbit);
                    }
                    continue;
                }

                // 8) Fire Meat Hook with INTERCEPT AIM (spec 009): lead the
                // shot by the target's sampled velocity, checked against the
                // same pure collision the engine implements. Cast orders
                // respect the 1 s cast hold — re-ordering every think cancels
                // the windup forever (archer war story).
                if (hook && hook.IsFullyCastable() && this.canCast(id)) {
                    const tp = target.GetAbsOrigin();
                    const vel = this.velocity[target.GetPlayerOwnerID()] ?? [0, 0];
                    const aim = interceptPoint(
                        [origin.x, origin.y],
                        [tp.x, tp.y],
                        vel,
                        hook.GetSpecialValueFor("hook_speed"),
                    );
                    const [dx, dy] = hookDirection([origin.x, origin.y], aim);
                    const range = hook.GetSpecialValueFor("hook_range");
                    const width = hook.GetSpecialValueFor("hook_width");
                    const candidates: HookCandidate[] = enemies.map(e => {
                        const ep = e.GetAbsOrigin();
                        return { id: e.entindex(), pos: [ep.x, ep.y] };
                    });
                    if (firstHookTarget([origin.x, origin.y], [dx, dy], range, width, candidates) === target.entindex()) {
                        this.castHookAt(hero, hook, GetGroundPosition(Vector(aim[0], aim[1], 0), hero), id);
                        continue;
                    }
                }
            }

            // 9) ROAM (spec 012) — the anti-robotic default. Waypoints in the
            // own field picked by mood (push/poke/lurk), spaced away from
            // teammates, held for the persona's period; the old formation
            // picket line is gone.
            const roamPos: [number, number] = [origin.x, origin.y];
            let wp = this.roamWp[id];
            if (!wp || this.tick >= (this.roamRepickAt[id] ?? 0) || reachedWaypoint(roamPos, wp)) {
                let rng = this.roamRng[id];
                if (!rng) {
                    rng = mulberry32(id * 7919 + 12345);
                    this.roamRng[id] = rng;
                }
                const persona = personaFor(id);
                const roster = rosters.get(hero.GetTeamNumber()) ?? [id];
                const mates: Array<readonly [number, number]> = [];
                for (const mateId of roster) {
                    if (mateId === id) continue;
                    const mate = heroForPlayer(mateId);
                    if (!mate || mate.IsNull() || !mate.IsAlive()) continue;
                    const mp = mate.GetAbsOrigin();
                    mates.push([mp.x, mp.y]);
                }
                wp = roamWaypoint(rng, side as -1 | 1, ROAM_BOUNDS, roamMood(rng(), persona.aggression), mates);
                this.roamWp[id] = wp;
                this.roamRepickAt[id] = this.tick + holdThinks(persona.period, THINK_INTERVAL);
                this.roamTotal++;
                print(Marker.roamWaypoint(id, this.roamTotal));
            }
            this.move(hero, wp[0], wp[1]);
        }

        if (this.tick % AUDIT_WINDOW_THINKS === 0) this.audit(bots);
        return THINK_INTERVAL;
    }

    /** Is there anything in the catalog this bot can afford and still stack? */
    private wantsPurchase(id: PlayerID): boolean {
        const owned = this.owned[id] ?? {};
        return nextPurchase({ gold: PlayerResource.GetGold(id), owned }, id) !== undefined;
    }

    /** The bot's Meteor item, if it bought one (spec 013). */
    private findMeteor(hero: CDOTA_BaseNPC_Hero): CDOTA_Item | undefined {
        for (let slot = 0; slot < 9; slot++) {
            const item = hero.GetItemInSlot(slot as InventorySlot);
            if (item && item.GetAbilityName() === "item_pudge_meteor") return item;
        }
        return undefined;
    }

    /** MOVE_TO_POSITION shorthand — always passes the side-lock order filter. */
    private move(hero: CDOTA_BaseNPC_Hero, x: number, y: number): void {
        ExecuteOrderFromTable({
            UnitIndex: hero.entindex(),
            OrderType: UnitOrder.MOVE_TO_POSITION,
            Position: GetGroundPosition(Vector(x, y, 0), hero),
            Queue: false,
        });
    }

    /** Archer castHold: at most one hook cast order per second per bot. */
    private canCast(id: PlayerID): boolean {
        return this.tick - (this.lastCastTick[id] ?? -99) >= 2;
    }

    private castHookAt(hero: CDOTA_BaseNPC_Hero, hook: CDOTABaseAbility, pos: Vector, id: PlayerID): void {
        this.lastCastTick[id] = this.tick;
        ExecuteOrderFromTable({
            UnitIndex: hero.entindex(),
            OrderType: UnitOrder.CAST_POSITION,
            AbilityIndex: hook.entindex(),
            Position: pos,
            Queue: false,
        });
    }

    private enemyHeroesOf(hero: CDOTA_BaseNPC_Hero): CDOTA_BaseNPC_Hero[] {
        const enemies: CDOTA_BaseNPC_Hero[] = [];
        const count = HeroList.GetHeroCount();
        for (let i = 0; i < count; i++) {
            const other = HeroList.GetHero(i);
            if (!other || other.IsNull() || !other.IsAlive()) continue;
            if (other.GetTeamNumber() === hero.GetTeamNumber()) continue;
            // 2026-08-03: the host's hero plays now (no more invisible
            // tripod), so every opposing hero — fake or host — is a target.
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
