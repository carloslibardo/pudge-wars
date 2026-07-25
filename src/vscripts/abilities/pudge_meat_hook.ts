import { BaseAbility, registerAbility } from "../lib/dota_ts_adapter";
import { hookDirection } from "../lib/hook";
import { Marker } from "../lib/markers";
import { e2eEnabled } from "../systems/e2eHarness";
import { modifier_pudge_hook_drag } from "../modifiers/modifier_pudge_hook_drag";

const HOOK_FX = "particles/units/heroes/hero_pudge/pudge_meathook.vpcf";

/** 2-decimal round for the direction printed in the fired marker (e2e only). */
function round2(n: number): number {
    return Math.floor(n * 100 + 0.5) / 100;
}

/**
 * Meat Hook — Pudge's signature skillshot. Fire a hook chain in a straight line;
 * the FIRST enemy it touches is latched, damaged, and dragged all the way back
 * to the caster (the drag is `modifier_pudge_hook_drag`). Miss and only the
 * cooldown is spent.
 *
 * The engine's linear projectile does the live collision (like the template's
 * example ability); the hook GEOMETRY it implements — first-along-the-ray
 * selection and the drag walk — is pinned in `lib/hook.ts` and unit-tested.
 *
 * All numbers come from KV (`GetSpecialValueFor`). The per-item bonuses that
 * shop items add on top are folded in by the `hook*` accessors below (spec 005).
 */
@registerAbility()
export class pudge_meat_hook extends BaseAbility {
    /** Base + item-bonus hook range. Items extend this via spec 005. */
    private hookRange(): number {
        return this.GetSpecialValueFor("hook_range");
    }
    private hookSpeed(): number {
        return this.GetSpecialValueFor("hook_speed");
    }
    private hookDamage(): number {
        return this.GetSpecialValueFor("hook_damage");
    }

    OnSpellStart(): void {
        const caster = this.GetCaster();
        const origin = caster.GetAbsOrigin();
        const cursor = this.GetCursorPosition();
        const [dx, dy] = hookDirection([origin.x, origin.y], [cursor.x, cursor.y]);
        const direction = Vector(dx, dy, 0);

        const range = this.hookRange();
        const width = this.GetSpecialValueFor("hook_width");

        ProjectileManager.CreateLinearProjectile({
            Ability: this,
            Source: caster,
            EffectName: HOOK_FX,
            vSpawnOrigin: (origin + direction * 80) as Vector,
            fDistance: range,
            fStartRadius: width,
            fEndRadius: width,
            vVelocity: (direction * this.hookSpeed()) as Vector,
            iUnitTargetTeam: UnitTargetTeam.ENEMY,
            iUnitTargetType: UnitTargetType.HERO,
            bProvidesVision: true,
            iVisionRadius: 300,
        });
        caster.EmitSound("Hero_Pudge.AttackHookExtend");

        if (e2eEnabled()) {
            print(Marker.hookFired(caster.GetPlayerOwnerID(), round2(dx), round2(dy)));
        }
    }

    /** Return true to consume the projectile (the first hero hit stops it). */
    OnProjectileHit(target: CDOTA_BaseNPC | undefined, _location: Vector): boolean {
        if (!target || target.IsNull()) return true; // max distance, or victim died mid-flight

        const caster = this.GetCaster();
        ApplyDamage({
            victim: target,
            attacker: caster,
            damage: this.hookDamage(),
            damage_type: DamageTypes.MAGICAL,
            ability: this,
        });
        target.EmitSound("Hero_Pudge.AttackHookImpact");

        if (e2eEnabled()) {
            print(Marker.hookLatched(caster.GetPlayerOwnerID(), target.entindex()));
        }

        // The drag modifier moves the VICTIM toward the caster; caster + ability
        // are carried so it can read drag_speed from KV and print the marker.
        modifier_pudge_hook_drag.apply(target, caster, this, {});
        return true;
    }
}
