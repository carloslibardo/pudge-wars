import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

const HASTE_FX = "particles/generic_gameplay/rune_haste_owner.vpcf";
const HASTE_PCT = 40;

/** River gift "haste" (spec 014 rev 3): a free sprint burst for the hooker —
 *  no ability backs it, so the bonus is a constant here. */
@registerModifier()
export class modifier_pudge_gift_haste extends BaseModifier {
    private fx?: ParticleID;

    IsHidden(): boolean {
        return false;
    }
    IsPurgable(): boolean {
        return true;
    }

    OnCreated(): void {
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
        return HASTE_PCT;
    }
}
