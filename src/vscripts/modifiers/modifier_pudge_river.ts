import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";
import { riverHazardDps, riverHazardTickDamage } from "../lib/river";
import { Marker } from "../lib/markers";
import {
    RIVER_HAZARD_CAP,
    RIVER_HAZARD_DPS,
    RIVER_HAZARD_GRACE,
    RIVER_HAZARD_RAMP,
    RIVER_HAZARD_TICK,
    RIVER_MOVE_SPEED_PCT,
} from "../config";
import { e2eEnabled } from "../systems/e2eFlags";

/** VPK-verified 2026-07-29: basename `venomancer_poison_debuff` under
 *  `particles/units/heroes/hero_venomancer` (spec-010 adjacency rule). */
const BURN_FX = "particles/units/heroes/hero_venomancer/venomancer_poison_debuff.vpcf";

/**
 * The river modifier (spec 012 rev of 004): +12% move speed while in the band
 * — crossings are quick — but the regen is gone, replaced by an escalating,
 * NEVER-lethal burn once a hero's continuous exposure passes the grace.
 * Added/removed by `systems/riverBand.ts` from the pure `isInRiver` check.
 *
 * Exposure PAUSES (never resets) while the hero is motion-controlled: a
 * mid-drag victim is the hook's business (the run-17 clock-reset lesson).
 * Damage is clamped to a 1 HP floor (`riverHazardTickDamage`) AND flagged
 * NON_LETHAL — a river death would suicide the kill feed.
 */
@registerModifier()
export class modifier_pudge_river extends BaseModifier {
    private burnParticle?: ParticleID;
    private exposure = 0;
    /** Throttle: [HAZARD] marker printed at most once per second per hero. */
    private sinceMarker = 0;

    IsHidden(): boolean {
        return false;
    }
    IsPurgable(): boolean {
        return false;
    }
    RemoveOnDeath(): boolean {
        return true;
    }
    IsDebuff(): boolean {
        return true;
    }

    DeclareFunctions(): ModifierFunction[] {
        return [ModifierFunction.MOVESPEED_BONUS_PERCENTAGE];
    }

    GetModifierMoveSpeedBonus_Percentage(): number {
        return RIVER_MOVE_SPEED_PCT;
    }

    OnCreated(): void {
        if (!IsServer()) return;
        this.StartIntervalThink(RIVER_HAZARD_TICK);
    }

    OnIntervalThink(): void {
        const parent = this.GetParent();
        if (parent.IsNull() || !parent.IsAlive()) return;
        // PAUSE under motion control — a dragged victim's clock holds.
        if (parent.IsCurrentlyHorizontalMotionControlled()) return;
        this.exposure += RIVER_HAZARD_TICK;

        const dps = riverHazardDps(
            this.exposure,
            RIVER_HAZARD_GRACE,
            RIVER_HAZARD_DPS,
            RIVER_HAZARD_RAMP,
            RIVER_HAZARD_CAP,
        );
        if (dps <= 0) return;

        if (this.burnParticle === undefined) {
            this.burnParticle = ParticleManager.CreateParticle(
                BURN_FX,
                ParticleAttachment.ABSORIGIN_FOLLOW,
                parent,
            );
        }
        const damage = riverHazardTickDamage(dps, RIVER_HAZARD_TICK, parent.GetHealth());
        if (damage > 0) {
            ApplyDamage({
                victim: parent,
                attacker: parent,
                damage,
                damage_type: DamageTypes.PURE,
                damage_flags: DamageFlag.NON_LETHAL | DamageFlag.NO_SPELL_AMPLIFICATION,
            });
        }
        this.sinceMarker += RIVER_HAZARD_TICK;
        if (e2eEnabled() && this.sinceMarker >= 1) {
            this.sinceMarker = 0;
            print(Marker.hazardTick(Math.floor(dps), parent.entindex()));
            if (!parent.IsAlive()) print(`[HAZARD] lethal on ${parent.entindex()}`);
        }
    }

    OnDestroy(): void {
        if (!IsServer()) return;
        if (this.burnParticle !== undefined) {
            ParticleManager.DestroyParticle(this.burnParticle, false);
            ParticleManager.ReleaseParticleIndex(this.burnParticle);
        }
    }
}
