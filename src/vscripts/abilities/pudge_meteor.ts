import { BaseItem, registerAbility } from "../lib/dota_ts_adapter";
import { Marker } from "../lib/markers";
import { e2eEnabled } from "../systems/e2eFlags";
import { modifier_pudge_meteor_stun } from "../modifiers/modifier_pudge_meteor_stun";

/** All VPK-verified 2026-07-29 (spec-010 adjacency rule):
 *  warning ring reuses the doubledamage rune glow (already precached),
 *  the meteor itself is Warlock's infernal fall. */
const WARNING_FX = "particles/generic_gameplay/rune_doubledamage.vpcf";
const METEOR_FX = "particles/units/heroes/hero_warlock/warlock_rain_of_chaos.vpcf";

/**
 * Meteor Hook (spec 013) — the shop's top-shelf active. Target a point: a
 * warning glow marks it for `delay` seconds, then a meteor crashes down,
 * damaging and STUNNING every enemy in the radius. The delay makes it a
 * skillshot (dodgeable, like everything in this game); bots slam it on hooked
 * victims mid-swarm where the victim cannot dodge.
 */
@registerAbility()
export class item_pudge_meteor extends BaseItem {
    OnSpellStart(): void {
        const caster = this.GetCaster();
        const point = this.GetCursorPosition();
        const delay = this.GetSpecialValueFor("delay");
        const radius = this.GetSpecialValueFor("radius");
        const damage = this.GetSpecialValueFor("damage");
        const stun = this.GetSpecialValueFor("stun_duration");

        const warning = ParticleManager.CreateParticle(
            WARNING_FX,
            ParticleAttachment.CUSTOMORIGIN,
            undefined,
        );
        ParticleManager.SetParticleControl(warning, 0, point);
        if (e2eEnabled()) print(Marker.meteorCast(caster.GetPlayerOwnerID()));

        Timers.CreateTimer(delay, () => {
            ParticleManager.DestroyParticle(warning, false);
            ParticleManager.ReleaseParticleIndex(warning);
            if (caster.IsNull()) return;

            const fall = ParticleManager.CreateParticle(
                METEOR_FX,
                ParticleAttachment.CUSTOMORIGIN,
                undefined,
            );
            ParticleManager.SetParticleControl(fall, 0, point);
            ParticleManager.ReleaseParticleIndex(fall);
            EmitSoundOnLocationWithCaster(point, "Hero_Warlock.RainOfChaos", caster);

            const victims = FindUnitsInRadius(
                caster.GetTeamNumber(),
                point,
                undefined,
                radius,
                UnitTargetTeam.ENEMY,
                UnitTargetType.HERO,
                UnitTargetFlags.NONE,
                FindOrder.ANY,
                false,
            );
            for (const victim of victims) {
                ApplyDamage({
                    victim,
                    attacker: caster,
                    damage,
                    damage_type: DamageTypes.MAGICAL,
                    ability: this,
                });
                if (victim.IsAlive()) {
                    modifier_pudge_meteor_stun.apply(victim, caster, this, { duration: stun });
                }
            }
            if (e2eEnabled()) print(Marker.meteorImpact(victims.length));
        });
    }
}
