import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

const AEGIS_FX = "particles/items2_fx/aegis_respawn.vpcf";

/**
 * Iron Gut (spec 010): 2 s of immortality. INVULNERABLE also means hooks
 * cannot latch the user while it runs (linear projectiles skip invulnerable
 * units) — that is the design, not a side effect. Golden aegis flash while up.
 */
@registerModifier()
export class modifier_pudge_wars_iron_gut extends BaseModifier {
    private fx?: ParticleID;

    IsHidden(): boolean {
        return false;
    }
    IsPurgable(): boolean {
        return false;
    }

    CheckState(): Partial<Record<ModifierState, boolean>> {
        return { [ModifierState.INVULNERABLE]: true };
    }

    OnCreated(): void {
        if (!IsServer()) return;
        this.fx = ParticleManager.CreateParticle(
            AEGIS_FX,
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
}
