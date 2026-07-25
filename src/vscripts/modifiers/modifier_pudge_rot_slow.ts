import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

/**
 * The move-slow Rot lays on enemies caught in the cloud. Re-applied every Rot
 * tick with a slightly-longer-than-a-tick duration, so it lingers exactly while
 * the enemy is being pulsed and fades once they leave. The slow percentage comes
 * from the Rot ability's KV (`rot_slow`), read through the passed ability.
 */
@registerModifier()
export class modifier_pudge_rot_slow extends BaseModifier {
    IsHidden(): boolean {
        return false;
    }
    IsPurgable(): boolean {
        return true;
    }
    RemoveOnDeath(): boolean {
        return true;
    }

    DeclareFunctions(): ModifierFunction[] {
        return [ModifierFunction.MOVESPEED_BONUS_PERCENTAGE];
    }

    GetModifierMoveSpeedBonus_Percentage(): number {
        const ability = this.GetAbility();
        const slow = ability !== undefined ? ability.GetSpecialValueFor("rot_slow") : 0;
        return -slow; // a slow is a negative move-speed bonus
    }
}
