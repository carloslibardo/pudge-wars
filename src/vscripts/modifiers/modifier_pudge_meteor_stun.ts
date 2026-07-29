import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

/** VPK-verified 2026-07-29: basename `generic_stunned` under
 *  `particles/generic_gameplay` — the classic swirl-of-stars tell. */
const STUN_FX = "particles/generic_gameplay/generic_stunned.vpcf";

/**
 * Meteor stun (spec 013). Own modifier instead of the engine's
 * `modifier_stunned` so the tell is guaranteed (explicit verified particle)
 * and the duration comes from the item KV via the apply() call.
 */
@registerModifier()
export class modifier_pudge_meteor_stun extends BaseModifier {
    private particle?: ParticleID;

    IsHidden(): boolean {
        return false;
    }
    IsDebuff(): boolean {
        return true;
    }
    IsPurgable(): boolean {
        return false;
    }
    RemoveOnDeath(): boolean {
        return true;
    }

    CheckState(): Partial<Record<ModifierState, boolean>> {
        return { [ModifierState.STUNNED]: true };
    }

    OnCreated(): void {
        if (!IsServer()) return;
        this.particle = ParticleManager.CreateParticle(
            STUN_FX,
            ParticleAttachment.OVERHEAD_FOLLOW,
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
