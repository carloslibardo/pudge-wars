import { BaseAbility, registerAbility } from "../lib/dota_ts_adapter";
import { modifier_pudge_rot } from "../modifiers/modifier_pudge_rot";

/**
 * Rot — a toggle. While on, `modifier_pudge_rot` pulses AoE damage around Pudge
 * (hurting him too, but never fatally — see `rotSelfDamage`) and slows enemies
 * caught in it. Toggling is the whole ability; all the work is in the modifier.
 *
 * IMMEDIATE + NO_TARGET so the toggle fires without a cast animation or target.
 */
@registerAbility()
export class pudge_rot extends BaseAbility {
    OnToggle(): void {
        const caster = this.GetCaster();
        if (this.GetToggleState()) {
            modifier_pudge_rot.apply(caster, caster, this, {});
        } else {
            caster.RemoveModifierByName("modifier_pudge_rot");
        }
    }
}
