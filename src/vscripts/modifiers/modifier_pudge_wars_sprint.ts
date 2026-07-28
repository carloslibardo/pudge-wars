import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

const HASTE_FX = "particles/generic_gameplay/rune_haste_owner.vpcf";

/** Sprint (spec 010): +move speed for a burst, with haste-rune speed streaks. */
@registerModifier()
export class modifier_pudge_wars_sprint extends BaseModifier {
    private fx?: ParticleID;
    private bonus = 0;

    IsHidden(): boolean {
        return false;
    }
    IsPurgable(): boolean {
        return true;
    }

    OnCreated(): void {
        const ability = this.GetAbility();
        this.bonus = ability !== undefined ? ability.GetSpecialValueFor("speed_bonus_pct") : 40;
        if (!IsServer()) return;
        this.fx = ParticleManager.CreateParticle(
            HASTE_FX,
            ParticleAttachment.ABSORIGIN_FOLLOW,
            this.GetParent(),
        );
    }

    OnDestroy(): void {
        if (!IsServer()) return;
        if (this.fx !== undefined) {
            ParticleManager.DestroyParticle(this.fx, false);
            ParticleManager.ReleaseParticleIndex(this.fx);
        }
    }

    DeclareFunctions(): ModifierFunction[] {
        return [ModifierFunction.MOVESPEED_BONUS_PERCENTAGE];
    }

    GetModifierMoveSpeedBonus_Percentage(): number {
        return this.bonus;
    }
}
