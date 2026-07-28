import { BaseAbility, registerAbility } from "../lib/dota_ts_adapter";
import { Marker } from "../lib/markers";
import { e2eEnabled } from "../systems/e2eFlags";
import { modifier_pudge_wars_vanish } from "../modifiers/modifier_pudge_wars_vanish";
import { modifier_pudge_wars_iron_gut } from "../modifiers/modifier_pudge_wars_iron_gut";
import { modifier_pudge_wars_sprint } from "../modifiers/modifier_pudge_wars_sprint";

const BLINK_FX = "particles/items_fx/blink_dagger_start.vpcf";

/**
 * The three spec-010 actives. Each is a no-target self-buff: apply the
 * registered modifier for `duration` from KV, fire the visible tell, print
 * the [SKILL] marker (e2e only). Numbers all live in KV AbilityValues.
 */
function announce(ability: BaseAbility, name: string): void {
    if (e2eEnabled()) {
        print(Marker.skillUsed(name, ability.GetCaster().GetPlayerOwnerID()));
    }
}

@registerAbility()
export class pudge_wars_vanish extends BaseAbility {
    OnSpellStart(): void {
        const caster = this.GetCaster();
        const fx = ParticleManager.CreateParticle(BLINK_FX, ParticleAttachment.ABSORIGIN, caster);
        ParticleManager.ReleaseParticleIndex(fx);
        caster.EmitSound("DOTA_Item.BlinkDagger.Activate");
        modifier_pudge_wars_vanish.apply(caster, caster, this, {
            duration: this.GetSpecialValueFor("duration"),
        });
        announce(this, "pudge_wars_vanish");
    }
}

@registerAbility()
export class pudge_wars_iron_gut extends BaseAbility {
    OnSpellStart(): void {
        const caster = this.GetCaster();
        caster.EmitSound("Item.PickUpRoshShop");
        modifier_pudge_wars_iron_gut.apply(caster, caster, this, {
            duration: this.GetSpecialValueFor("duration"),
        });
        announce(this, "pudge_wars_iron_gut");
    }
}

@registerAbility()
export class pudge_wars_sprint extends BaseAbility {
    OnSpellStart(): void {
        const caster = this.GetCaster();
        caster.EmitSound("Rune.Haste");
        modifier_pudge_wars_sprint.apply(caster, caster, this, {
            duration: this.GetSpecialValueFor("duration"),
        });
        announce(this, "pudge_wars_sprint");
    }
}
