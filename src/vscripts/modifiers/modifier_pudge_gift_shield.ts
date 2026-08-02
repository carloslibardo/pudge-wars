import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

/** Aegis flash — precached since spec 010; reused as the "shield spent" pop. */
const CONSUME_FX = "particles/items_fx/aegis_respawn.vpcf";

/**
 * River gift "shield" (spec 014 rev 3): the next enemy hook that would latch
 * this hero is eaten instead — THE counterplay to lethal drags (one landed
 * hook is otherwise a kill). `pudge_meat_hook.OnProjectileHit` checks for this
 * modifier and calls `consume()` instead of latching.
 */
@registerModifier()
export class modifier_pudge_gift_shield extends BaseModifier {
    IsHidden(): boolean {
        return false;
    }
    IsPurgable(): boolean {
        return false; // a dispel should not strip hook immunity silently
    }

    /** Spend the shield: flash and remove. */
    public consume(): void {
        const me = this.GetParent();
        const fx = ParticleManager.CreateParticle(
            CONSUME_FX,
            ParticleAttachment.ABSORIGIN_FOLLOW,
            me,
        );
        ParticleManager.ReleaseParticleIndex(fx);
        me.EmitSound("Item.Aegis.Activate");
        this.Destroy();
    }
}
