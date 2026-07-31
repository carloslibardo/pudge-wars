/**
 * River gifts (spec 006): every interval, one glowing chest spawns mid-river —
 * in the uncrossable band, so a hook is the ONLY way to collect it. The hook
 * latches it like a hero (pudge_meat_hook's gift branch), the drag modifier
 * slides it home, and on arrival `redeem()` pays out one of three gifts.
 *
 * WHICH gift, WHERE it spawns, and WHO should hunt it are pure decisions in
 * `lib/riverGift.ts`; this is the engine shell. Statics (not instance state)
 * on purpose: the drag modifier resolves a chest arrival without holding a
 * system reference.
 */
import { chooseGift, driftStep, giftSpawnY } from "../lib/riverGift";
import { SHOP_ITEMS } from "../lib/shop";
import { Marker } from "../lib/markers";
import {
    GIFT_DRIFT_SPEED,
    GIFT_DRIFT_TICK,
    GIFT_DRIFT_Y_MAX,
    GIFT_GOLD_PURSE,
    GIFT_MATERIALIZE_SECONDS,
    GIFT_SPAWN_INTERVAL,
    GIFT_SPAWN_Y_MAX,
} from "../config";
import { e2eEnabled } from "./e2eFlags";

const GIFT_UNIT = "npc_pudge_river_gift";
const GLOW_FX = "particles/generic_gameplay/rune_doubledamage.vpcf";
/** Spec 014: a spawn must be an EVENT — the TP-scroll light column, VPK-verified
 *  2026-07-29 (`teleport_end` under `particles/items2_fx`). */
const BEACON_FX = "particles/items2_fx/teleport_end.vpcf";
const BEACON_SECONDS = 5;
const GIFT_MODEL_SCALE = 1.6;

export class RiverGiftSystem {
    private static current: CDOTA_BaseNPC | undefined;
    private static glow: ParticleID | undefined;
    private static spawnedAt = 0;
    private static driftDir: 1 | -1 = 1;

    /** Seconds the live chest has existed, or undefined without one. */
    public static age(): number | undefined {
        if (!RiverGiftSystem.currentGift()) return undefined;
        return GameRules.GetGameTime() - RiverGiftSystem.spawnedAt;
    }

    /** The live chest's drift velocity along Y (u/s) — 0 while it is still
     *  materializing or being dragged. Hunters use this for aim lead. */
    public static driftVelocityY(): number {
        const chest = RiverGiftSystem.currentGift();
        const age = RiverGiftSystem.age();
        if (!chest || age === undefined || age < GIFT_MATERIALIZE_SECONDS) return 0;
        if (chest.HasModifier("modifier_pudge_hook_drag")) return 0;
        return RiverGiftSystem.driftDir * GIFT_DRIFT_SPEED;
    }

    constructor() {
        Timers.CreateTimer(GIFT_SPAWN_INTERVAL, () => this.spawn());
    }

    /** The live chest, if one is up. */
    public static currentGift(): CDOTA_BaseNPC | undefined {
        const c = RiverGiftSystem.current;
        if (!c || c.IsNull() || !c.IsAlive()) return undefined;
        return c;
    }

    public static isGift(unit: CDOTA_BaseNPC): boolean {
        return unit.GetUnitName() === GIFT_UNIT;
    }

    private spawn(): number {
        // Wait for the horn; max one chest alive at a time (spec 006).
        if (GameRules.State_Get() !== GameState.GAME_IN_PROGRESS) return GIFT_SPAWN_INTERVAL;
        if (RiverGiftSystem.currentGift()) return GIFT_SPAWN_INTERVAL;

        const y = Math.floor(giftSpawnY(RandomFloat(0, 1), GIFT_SPAWN_Y_MAX));
        const pos = GetGroundPosition(Vector(0, y, 0), undefined);
        const chest = CreateUnitByName(GIFT_UNIT, pos, false, undefined, undefined, DotaTeam.NEUTRALS);
        if (!chest || chest.IsNull()) return GIFT_SPAWN_INTERVAL;
        chest.SetIdleAcquire(false);
        chest.Stop();
        chest.SetModelScale(GIFT_MODEL_SCALE);
        RiverGiftSystem.current = chest;
        RiverGiftSystem.spawnedAt = GameRules.GetGameTime();
        RiverGiftSystem.glow = ParticleManager.CreateParticle(
            GLOW_FX,
            ParticleAttachment.ABSORIGIN_FOLLOW,
            chest,
        );
        // Spec 014: announce the spawn — light column + global chime. The
        // column is destroyed on a timer (some TP particles loop forever).
        const beacon = ParticleManager.CreateParticle(
            BEACON_FX,
            ParticleAttachment.CUSTOMORIGIN,
            undefined,
        );
        ParticleManager.SetParticleControl(beacon, 0, pos);
        Timers.CreateTimer(BEACON_SECONDS, () => {
            ParticleManager.DestroyParticle(beacon, false);
            ParticleManager.ReleaseParticleIndex(beacon);
        });
        EmitGlobalSound("Rune.Bounty");
        if (e2eEnabled()) print(Marker.giftSpawned(y));

        // Spec 014 rev 2: after the look-don't-touch materialize, the chest
        // breaks loose and floats along the river — toward the far half, so a
        // mid-band spawn still travels visibly. The drift PAUSES while a hook
        // drags the chest (the drag modifier owns its position then).
        RiverGiftSystem.driftDir = y >= 0 ? -1 : 1;
        Timers.CreateTimer(GIFT_MATERIALIZE_SECONDS, () => {
            if (RiverGiftSystem.currentGift() !== chest) return undefined;
            if (e2eEnabled()) print(Marker.giftDrifting(RiverGiftSystem.driftDir));
            Timers.CreateTimer(GIFT_DRIFT_TICK, () => {
                if (RiverGiftSystem.currentGift() !== chest) return undefined;
                if (chest.HasModifier("modifier_pudge_hook_drag")) return GIFT_DRIFT_TICK;
                const at = chest.GetAbsOrigin();
                const step = driftStep(
                    at.y,
                    RiverGiftSystem.driftDir,
                    GIFT_DRIFT_SPEED,
                    GIFT_DRIFT_TICK,
                    GIFT_DRIFT_Y_MAX,
                );
                RiverGiftSystem.driftDir = step.dir;
                chest.SetAbsOrigin(GetGroundPosition(Vector(at.x, step.y, 0), chest));
                return GIFT_DRIFT_TICK;
            });
            return undefined;
        });
        return GIFT_SPAWN_INTERVAL;
    }

    /**
     * A dragged chest arrived at `caster`: pay out and remove it. Called by
     * `modifier_pudge_hook_drag` on arrival. Gift choice is the pure
     * `chooseGift` with an injected roll.
     */
    public static redeem(chest: CDOTA_BaseNPC, caster: CDOTA_BaseNPC): void {
        const pid = caster.GetPlayerOwnerID();
        const kind = chooseGift(RandomFloat(0, 1));
        if (kind === "gold") {
            if (pid !== -1) {
                PlayerResource.ModifyGold(pid, GIFT_GOLD_PURSE, true, ModifyGoldReason.UNSPECIFIED);
                SendOverheadEventMessage(
                    undefined,
                    OverheadAlert.GOLD,
                    caster,
                    GIFT_GOLD_PURSE,
                    undefined,
                );
            }
        } else if (kind === "heal") {
            caster.Heal(caster.GetMaxHealth(), undefined);
            SendOverheadEventMessage(
                undefined,
                OverheadAlert.HEAL,
                caster,
                caster.GetMaxHealth(),
                undefined,
            );
        } else {
            // Free catalog item. RandomInt is inclusive on both ends.
            const item = SHOP_ITEMS[RandomInt(0, SHOP_ITEMS.length - 1)];
            caster.AddItemByName(item.name); // full inventory → engine drops it at his feet
        }
        EmitSoundOn("Rune.Bounty", caster);
        if (e2eEnabled()) print(Marker.giftRedeemed(kind, pid));

        if (RiverGiftSystem.glow !== undefined) {
            ParticleManager.DestroyParticle(RiverGiftSystem.glow, false);
            ParticleManager.ReleaseParticleIndex(RiverGiftSystem.glow);
            RiverGiftSystem.glow = undefined;
        }
        RiverGiftSystem.current = undefined;
        UTIL_Remove(chest);
    }
}
