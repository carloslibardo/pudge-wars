/**
 * Visible hook chain (spec 011).
 *
 * `pudge_meathook.vpcf` is a control-point beam — CP0 anchors at the caster,
 * CP1 is the hook head — and NOBODY drives those CPs automatically. Passing it
 * as a linear projectile's EffectName (the pre-011 code) renders nothing: the
 * projectile system never touches particle CPs. So the chain is created and
 * driven manually here: the ability updates CP1 every projectile think while
 * the hook flies, the drag modifier updates it every motion frame while a
 * victim slides home, and a miss retracts the head back to the caster.
 *
 * One chain per caster (Meat Hook is one-at-a-time per Pudge); keyed by caster
 * entindex. CP0 uses ABSORIGIN_FOLLOW — attach-point names live in the model
 * binary and cannot be VPK-verified, and a wrong attach name renders at the
 * world origin silently (the spec-010 invisible-particle class of bug).
 */
import { Marker } from "../lib/markers";
import { e2eEnabled } from "./e2eFlags";

/** Io's tether — a genuine two-CP beam that renders from raw
 *  SetParticleControl endpoints. Winner of the run-31 candidate panel
 *  (`systems/fxTestPanel.ts`): wisp_tether and razor_static_link_beam drew in
 *  both raw and entity-anchored modes; pudge_meathook (run 28) and
 *  rattletrap_hookshot (run 29) drew NOTHING in either mode — those vanilla
 *  assets need engine-internal state no script API provides. Do not swap this
 *  path without re-running the panel (PW_FXTEST=1). */
const CHAIN_FX = "particles/units/heroes/hero_wisp/wisp_tether.vpcf";
/** Chain height off the ground at both endpoints. */
const CHAIN_Z = 80;
const RETRACT_TICK = 0.03;

export type ChainRelease = "hit" | "miss" | "drag_complete" | "interrupted";

interface ChainState {
    particle: ParticleID;
    /** Latest hook-head position (CP1). */
    head: Vector;
    /** A retracting chain ignores further head updates. */
    retracting: boolean;
}

export class HookChain {
    private static chains = new Map<EntityIndex, ChainState>();

    /** Create the chain at hook fire. Any stale chain from a prior cast dies first. */
    public static attach(caster: CDOTA_BaseNPC): void {
        HookChain.release(caster, "interrupted");
        // CUSTOMORIGIN + BOTH endpoints driven manually every update: no
        // reliance on attachment semantics, and a reversed CP order draws the
        // identical line (run-28 lesson: trust nothing you cannot see).
        const particle = ParticleManager.CreateParticle(
            CHAIN_FX,
            ParticleAttachment.CUSTOMORIGIN,
            undefined,
        );
        const origin = caster.GetAbsOrigin();
        HookChain.chains.set(caster.entindex(), { particle, head: origin, retracting: false });
        HookChain.setEndpoints(particle, origin, origin);
        if (e2eEnabled()) print(Marker.chainAttached(caster.GetPlayerOwnerID()));
    }

    private static setEndpoints(particle: ParticleID, anchor: Vector, head: Vector): void {
        ParticleManager.SetParticleControl(particle, 0, (anchor + Vector(0, 0, CHAIN_Z)) as Vector);
        ParticleManager.SetParticleControl(particle, 1, (head + Vector(0, 0, CHAIN_Z)) as Vector);
    }

    /** Drive both CPs — called from projectile think (flight) and drag motion (return). */
    public static updateHead(caster: CDOTA_BaseNPC, pos: Vector): void {
        if (caster.IsNull()) return;
        const chain = HookChain.chains.get(caster.entindex());
        if (!chain || chain.retracting) return;
        chain.head = pos;
        HookChain.setEndpoints(chain.particle, caster.GetAbsOrigin(), pos);
    }

    /** Destroy the chain with a reason. Idempotent — safe on double release. */
    public static release(caster: CDOTA_BaseNPC, reason: ChainRelease): void {
        if (caster.IsNull()) return;
        const chain = HookChain.chains.get(caster.entindex());
        if (!chain) return;
        HookChain.chains.delete(caster.entindex());
        ParticleManager.DestroyParticle(chain.particle, false);
        ParticleManager.ReleaseParticleIndex(chain.particle);
        if (e2eEnabled()) print(Marker.chainReleased(caster.GetPlayerOwnerID(), reason));
    }

    /**
     * A missed hook walks CP1 back to the caster at `speed`, then releases.
     * The caster keeps moving during the retract — each tick re-reads its
     * origin, so the chain reels IN rather than pointing at a stale spot.
     */
    public static retract(caster: CDOTA_BaseNPC, speed: number): void {
        const chain = HookChain.chains.get(caster.entindex());
        if (!chain || chain.retracting) return;
        chain.retracting = true;
        Timers.CreateTimer(RETRACT_TICK, () => {
            if (caster.IsNull() || !HookChain.chains.has(caster.entindex())) {
                if (!caster.IsNull()) HookChain.release(caster, "miss");
                return undefined;
            }
            const home = caster.GetAbsOrigin();
            const dx = home.x - chain.head.x;
            const dy = home.y - chain.head.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const step = speed * RETRACT_TICK;
            if (dist <= step || dist === 0) {
                HookChain.release(caster, "miss");
                return undefined;
            }
            chain.head = Vector(
                chain.head.x + (dx / dist) * step,
                chain.head.y + (dy / dist) * step,
                home.z,
            );
            HookChain.setEndpoints(chain.particle, home, chain.head);
            return RETRACT_TICK;
        });
    }
}
