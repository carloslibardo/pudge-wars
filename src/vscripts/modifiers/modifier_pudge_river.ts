import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";
import { RIVER_HP_REGEN, RIVER_MOVE_SPEED_PCT } from "../config";

const RIVER_FX = "particles/generic_gameplay/rune_haste_owner.vpcf";

/**
 * The river buff: bonus move speed + constant HP regen while a hero stands in
 * the mid-map band. Added and removed by `systems/riverBand.ts` based on the
 * pure `isInRiver` check; this modifier just grants the stats and owns the
 * particle. Its numbers come from `config.ts` (there is no KV ability to hang
 * them on — the river is a coordinate mechanic, not an ability).
 */
@registerModifier()
export class modifier_pudge_river extends BaseModifier {
    private particle?: ParticleID;

    IsHidden(): boolean {
        return false;
    }
    IsPurgable(): boolean {
        return false;
    }
    RemoveOnDeath(): boolean {
        return true;
    }

    DeclareFunctions(): ModifierFunction[] {
        return [
            ModifierFunction.MOVESPEED_BONUS_PERCENTAGE,
            ModifierFunction.HEALTH_REGEN_CONSTANT,
        ];
    }

    GetModifierMoveSpeedBonus_Percentage(): number {
        return RIVER_MOVE_SPEED_PCT;
    }

    GetModifierConstantHealthRegen(): number {
        return RIVER_HP_REGEN;
    }

    OnCreated(): void {
        if (!IsServer()) return;
        this.particle = ParticleManager.CreateParticle(
            RIVER_FX,
            ParticleAttachment.ABSORIGIN_FOLLOW,
            this.GetParent(),
        );
    }

    OnDestroy(): void {
        if (!IsServer()) return;
        if (this.particle !== undefined) {
            ParticleManager.DestroyParticle(this.particle, false);
            ParticleManager.ReleaseParticleIndex(this.particle);
        }
    }
}
