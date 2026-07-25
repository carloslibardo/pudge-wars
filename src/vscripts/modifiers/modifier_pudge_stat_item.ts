import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

/**
 * The shared passive stat modifier for the stat shop items (boots / flask /
 * gut_stitch). It declares all three stat properties and reads each from the
 * owning item's KV; an item that does not define a given `bonus_*` value reads 0
 * for it, so boots grant only move speed, the flask only regen, and so on — one
 * modifier, per-item numbers.
 */
@registerModifier()
export class modifier_pudge_stat_item extends BaseModifier {
    IsHidden(): boolean {
        return true; // an item passive, not a status the player toggles
    }
    IsPurgable(): boolean {
        return false;
    }
    RemoveOnDeath(): boolean {
        return false;
    }

    DeclareFunctions(): ModifierFunction[] {
        return [
            ModifierFunction.MOVESPEED_BONUS_CONSTANT,
            ModifierFunction.HEALTH_BONUS,
            ModifierFunction.HEALTH_REGEN_CONSTANT,
        ];
    }

    GetModifierMoveSpeedBonus_Constant(): number {
        return this.val("bonus_movespeed");
    }
    GetModifierHealthBonus(): number {
        return this.val("bonus_health");
    }
    GetModifierConstantHealthRegen(): number {
        return this.val("bonus_health_regen");
    }

    private val(key: string): number {
        const ability = this.GetAbility();
        return ability !== undefined ? ability.GetSpecialValueFor(key) : 0;
    }
}
