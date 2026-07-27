import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";
import { rotSelfDamage } from "../lib/combat";
import { Marker } from "../lib/markers";
import { e2eEnabled } from "../systems/e2eFlags";
import { modifier_pudge_rot_slow } from "./modifier_pudge_rot_slow";

const ROT_FX = "particles/units/heroes/hero_pudge/pudge_rot.vpcf";

/**
 * The active half of Rot: an interval think that damages nearby enemies and
 * Pudge himself, and slows the enemies. Self-damage is clamped by `rotSelfDamage`
 * so Rot can NEVER kill its own caster — the rule lives in `lib/combat.ts` where
 * a test pins it.
 *
 * The think is server-gated and does one `FindUnitsInRadius` per tick (not per
 * enemy); the hoisted find + reused values keep it allocation-light on the tick
 * (/tstl-lua-gotchas).
 */
@registerModifier()
export class modifier_pudge_rot extends BaseModifier {
    private particle?: ParticleID;
    private tickInterval = 0.5;

    IsHidden(): boolean {
        return false;
    }
    IsPurgable(): boolean {
        return false;
    }
    RemoveOnDeath(): boolean {
        return true;
    }

    OnCreated(): void {
        if (!IsServer()) return;
        const parent = this.GetParent();
        this.particle = ParticleManager.CreateParticle(
            ROT_FX,
            ParticleAttachment.ABSORIGIN_FOLLOW,
            parent,
        );
        const interval = this.ability().GetSpecialValueFor("tick_interval");
        this.tickInterval = interval > 0 ? interval : 0.5;
        this.StartIntervalThink(this.tickInterval);
        // e2e lifecycle probes (2026-07-27): run 8 showed the modifier
        // PRESENT (HasModifier true right after apply) yet zero [ROT] ticks
        // over a full match — these pin down whether it is created-then-
        // instantly-destroyed, never thinking, or dying mid-think.
        if (e2eEnabled()) print(`[ROT] modifier created, interval ${this.tickInterval}`);
    }

    OnIntervalThink(): void {
        if (!IsServer()) return;
        if (e2eEnabled()) print("[ROT] think enter");
        const caster = this.GetParent();
        if (caster.IsNull() || !caster.IsAlive()) return;

        const ability = this.ability();
        const radius = ability.GetSpecialValueFor("rot_radius");
        const enemyDamage = ability.GetSpecialValueFor("rot_damage");
        const rawSelf = ability.GetSpecialValueFor("rot_self_damage");
        const origin = caster.GetAbsOrigin();

        const enemies = FindUnitsInRadius(
            caster.GetTeamNumber(),
            origin,
            undefined,
            radius,
            UnitTargetTeam.ENEMY,
            UnitTargetType.HERO,
            UnitTargetFlags.NONE,
            FindOrder.ANY,
            false,
        );
        for (const enemy of enemies) {
            ApplyDamage({
                victim: enemy,
                attacker: caster,
                damage: enemyDamage,
                damage_type: DamageTypes.MAGICAL,
                ability,
            });
            modifier_pudge_rot_slow.apply(enemy, caster, ability, {
                duration: this.tickInterval * 1.2,
            });
        }

        // Self-damage, clamped so Pudge always keeps >= 1 HP. Pure HP loss so it
        // can't be lifesteal'd or amplified around the clamp.
        const clampedSelf = rotSelfDamage(caster.GetHealth(), rawSelf);
        if (clampedSelf > 0) {
            ApplyDamage({
                victim: caster,
                attacker: caster,
                damage: clampedSelf,
                damage_type: DamageTypes.PURE,
                ability,
                damage_flags: DamageFlag.HPLOSS | DamageFlag.NO_SPELL_LIFESTEAL,
            });
        }

        if (e2eEnabled()) print(Marker.rotTick(clampedSelf, enemies.length));
    }

    OnDestroy(): void {
        if (!IsServer()) return;
        if (e2eEnabled()) print("[ROT] modifier destroyed");
        if (this.particle !== undefined) {
            ParticleManager.DestroyParticle(this.particle, false);
            ParticleManager.ReleaseParticleIndex(this.particle);
        }
    }

    /** The Rot ability, or a throw — it is always present for this modifier. */
    private ability(): CDOTABaseAbility {
        const ability = this.GetAbility();
        if (ability === undefined) throw "modifier_pudge_rot has no ability";
        return ability;
    }
}
