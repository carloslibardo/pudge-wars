import { reloadable } from "./lib/tstl-utils";
import { ScoreTracker } from "./lib/score";
import { Marker } from "./lib/markers";
import { SpawnPositions } from "./systems/spawnPositions";
import { RiverSystem } from "./systems/riverBand";
import { RiverGiftSystem } from "./systems/riverGifts";
import { SideLockSystem } from "./systems/sideLock";
import { E2EHarness, e2eEnabled, e2eKillTarget } from "./systems/e2eHarness";
import {
    KILL_BOUNTY,
    KILLS_TO_WIN,
    PASSIVE_GOLD_AMOUNT,
    PASSIVE_GOLD_INTERVAL,
    PLAYERS_PER_TEAM,
    RESPAWN_SECONDS,
    STARTING_GOLD,
} from "./config";
import type { Side } from "./lib/battleLines";

// Abilities and modifiers are imported for their @register* decorator SIDE
// EFFECT — TSTL only emits Lua for modules reachable from the entry point, so
// an unimported ability simply does not exist at runtime, with no error (L8).
// Bases (dota_ts_adapter) load first via these modules' own imports.
import "./abilities/pudge_meat_hook";
import "./modifiers/modifier_pudge_hook_drag";
import "./abilities/pudge_rot";
import "./modifiers/modifier_pudge_wars_rot";
import "./modifiers/modifier_pudge_wars_rot_slow";
import "./abilities/pudge_flesh_heap";
import "./modifiers/modifier_pudge_wars_flesh_heap";
import "./modifiers/modifier_pudge_river";
import "./abilities/pudge_items";
import "./modifiers/modifier_pudge_stat_item";
import "./abilities/pudge_wars_skills";
import "./modifiers/modifier_pudge_wars_vanish";
import "./modifiers/modifier_pudge_wars_iron_gut";
import "./modifiers/modifier_pudge_wars_sprint";
import "./abilities/pudge_meteor";
import "./modifiers/modifier_pudge_meteor_stun";
import "./modifiers/modifier_pudge_gift_haste";
import "./modifiers/modifier_pudge_gift_shield";
import { ShopPads } from "./systems/shopPads";
import { precacheFxTestPanel, startFxTestPanel } from "./systems/fxTestPanel";

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
        // Spec 011 chain (wisp tether — run-31 panel winner; pudge_meathook and
        // rattletrap_hookshot never rendered under script CP driving; see
        // systems/hookChain.ts). Explicit even though the panel precache below
        // also covers it: the chain must survive the panel's removal.
        PrecacheResource("particle", "particles/units/heroes/hero_wisp/wisp_tether.vpcf", context);
        PrecacheResource("particle", "particles/units/heroes/hero_pudge/pudge_rot.vpcf", context);
        PrecacheResource("particle", "particles/generic_gameplay/rune_haste_owner.vpcf", context);
        // River gift chest (spec 006): un-precached unit = "unit ... is
        // invalid" on first spawn; un-precached glow renders nothing, silently.
        PrecacheUnitByNameSync("npc_pudge_river_gift", context);
        PrecacheResource("model", "models/props_debris/merchant_debris_chest001.vmdl", context);
        PrecacheResource("particle", "particles/generic_gameplay/rune_doubledamage.vpcf", context);
        // Spec 010 skill tells (all VPK-verified paths).
        PrecacheResource("particle", "particles/items_fx/blink_dagger_start.vpcf", context);
        PrecacheResource("particle", "particles/items_fx/aegis_respawn.vpcf", context);
        // Specs 012-014 (all VPK-verified 2026-07-29).
        PrecacheResource("particle", "particles/units/heroes/hero_venomancer/venomancer_poison_debuff.vpcf", context);
        PrecacheResource("particle", "particles/generic_gameplay/generic_stunned.vpcf", context);
        PrecacheResource("particle", "particles/units/heroes/hero_warlock/warlock_rain_of_chaos.vpcf", context);
        PrecacheResource("particle", "particles/items2_fx/teleport_end.vpcf", context);
        PrecacheResource("particle", "particles/generic_gameplay/rune_regeneration.vpcf", context);
        // Shop-pad landmarks (spec 013 visibility fix): un-precached models
        // spawn as ERROR/invisible and un-precached particles render nothing,
        // both silently.
        PrecacheResource("model", "models/heroes/shopkeeper/shopkeeper.vmdl", context);
        PrecacheResource("model", "models/heroes/shopkeeper_dire/shopkeeper_dire.vmdl", context);
        PrecacheResource("particle", "particles/ui_mouseactions/range_display.vpcf", context);
        // FX candidate panel (spec 011 diagnostic; only draws with
        // +pudge_wars_fxtest 1, but un-precached particles render nothing).
        precacheFxTestPanel(context);
    }

    public static Activate(this: void) {
        Convars.RegisterConvar("pudge_wars_e2e", "0", "Engage the headless e2e harness (tools only)", ConVarFlags.NONE);
        Convars.RegisterConvar("pudge_wars_e2e_kills", "0", "e2e win-threshold override (0 = real KILLS_TO_WIN)", ConVarFlags.NONE);
        Convars.RegisterConvar("pudge_wars_fxtest", "0", "Draw the spec-011 chain-FX candidate panel at match start (tools only)", ConVarFlags.NONE);
        GameRules.Addon = new GameMode();
    }

    constructor() {
        this.configure();
        ListenToGameEvent("game_rules_state_change", () => this.onStateChange(), undefined);
        // Custom-game teams get no Hammer spawn points, so without this every
        // hero spawns at the world origin in one pile (L7). This puts the two
        // teams on their mirrored battle lines each spawn.
        new SpawnPositions(TEAM_SIDES);
        // The river down the middle is a coordinate band, buffing whoever stands
        // in it (spec 004). Pure membership check + thin scanner.
        new RiverSystem();
        new RiverGiftSystem();
        new SideLockSystem();
        // Registers now, but DRAWS at the horn — pad FX created this early
        // (before any client connects) would render for nobody (see shopPads.ts).
        new ShopPads();
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
        ListenToGameEvent("dota_item_purchased", event => this.onItemPurchased(event), undefined);
    }

    private onItemPurchased(event: DotaItemPurchasedEvent): void {
        // Only mark our custom items; native/neutral buys are noise.
        if (event.itemname === "" || !event.itemname.startsWith("item_pudge_")) return;
        if (e2eEnabled()) print(Marker.itemPurchased(event.itemname, event.PlayerID));
    }

    private onStateChange(): void {
        const state = GameRules.State_Get();
        if (state === GameState.CUSTOM_GAME_SETUP) {
            this.e2e.seatEarly(); // fake clients must be seated before selection closes (L6)
            Timers.CreateTimer(IsInToolsMode() ? 3 : 5, () => GameRules.FinishCustomGameSetup());
        }
        if (state === GameState.GAME_IN_PROGRESS) {
            this.grantStartingGold();
            // Spec 013: classic periodic income — everyone shops, all match.
            Timers.CreateTimer(PASSIVE_GOLD_INTERVAL, () => {
                for (let i = 0; i < 24; i++) {
                    const pid = i as PlayerID;
                    if (!PlayerResource.IsValidPlayerID(pid)) continue;
                    PlayerResource.ModifyGold(pid, PASSIVE_GOLD_AMOUNT, true, ModifyGoldReason.UNSPECIFIED);
                }
                return PASSIVE_GOLD_INTERVAL;
            });
            this.e2e.start();
            startFxTestPanel();
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

        // Kill bounty funds the shop over a 10-kill game (spec 005).
        const killerPid = attacker.GetPlayerOwnerID();
        if (killerPid !== -1) {
            PlayerResource.ModifyGold(killerPid, KILL_BOUNTY, true, ModifyGoldReason.HERO_KILL);
        }

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
        const heap = attacker.FindModifierByName("modifier_pudge_wars_flesh_heap");
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
