/**
 * FX candidate panel (spec 011 diagnostic) — e2e only, convar-gated.
 *
 * Two chain particles have now failed to render under manual CP driving
 * (pudge_meathook run 28, rattletrap_hookshot run 29) while a plain
 * CUSTOMORIGIN world particle (teleport_end beacon) renders fine. This panel
 * settles the question empirically: it draws a static test beam per candidate
 * particle across the river, in both CP-driving modes, for 80 s at match
 * start. One recorded run then shows exactly which particle+mode combinations
 * actually produce a visible beam.
 *
 * Rows are indexed bottom-to-top by Y; [FXTEST] markers map row → particle so
 * the frame review needs no guessing. Enable with `+pudge_wars_fxtest 1`
 * (never on in a publish run — the panel is deliberate screen clutter).
 */
import { Marker } from "../lib/markers";

interface Candidate {
    fx: string;
    /** raw: SetParticleControl positions; ent: SetParticleControlEnt to units. */
    mode: "raw" | "ent";
}

/** All paths VPK-verified 2026-07-29 (scratchpad vpk dump, dir-adjacency). */
const CANDIDATES: Candidate[] = [
    { fx: "particles/units/heroes/hero_wisp/wisp_tether.vpcf", mode: "raw" },
    { fx: "particles/units/heroes/hero_razor/razor_static_link_beam.vpcf", mode: "raw" },
    { fx: "particles/units/heroes/hero_razor/razor_static_link.vpcf", mode: "raw" },
    { fx: "particles/units/heroes/hero_batrider/batrider_flaming_lasso.vpcf", mode: "raw" },
    { fx: "particles/units/heroes/hero_pudge/pudge_meathook.vpcf", mode: "ent" },
    { fx: "particles/units/heroes/hero_rattletrap/rattletrap_hookshot.vpcf", mode: "ent" },
    { fx: "particles/units/heroes/hero_wisp/wisp_tether.vpcf", mode: "ent" },
    { fx: "particles/units/heroes/hero_razor/razor_static_link_beam.vpcf", mode: "ent" },
];

const ROW_Y_BASE = -1200;
const ROW_Y_STEP = 340;
const BEAM_HALF_X = 700;
const BEAM_Z = 80;
const START_DELAY = 20;
const PANEL_SECONDS = 80;
/** Anchor unit for ent-mode rows; invulnerable so stray hooks shrug off. */
const ANCHOR_UNIT = "npc_pudge_river_gift";

export function fxTestEnabled(): boolean {
    return IsInToolsMode() && Convars.GetInt("pudge_wars_fxtest") === 1;
}

export function precacheFxTestPanel(context: CScriptPrecacheContext): void {
    for (const c of CANDIDATES) PrecacheResource("particle", c.fx, context);
}

export function startFxTestPanel(): void {
    if (!fxTestEnabled()) return;
    Timers.CreateTimer(START_DELAY, () => {
        const particles: ParticleID[] = [];
        const anchors: CDOTA_BaseNPC[] = [];

        CANDIDATES.forEach((c, i) => {
            const y = ROW_Y_BASE + i * ROW_Y_STEP;
            const left = GetGroundPosition(Vector(-BEAM_HALF_X, y, 0), undefined);
            const right = GetGroundPosition(Vector(BEAM_HALF_X, y, 0), undefined);
            const p = ParticleManager.CreateParticle(
                c.fx,
                ParticleAttachment.CUSTOMORIGIN,
                undefined,
            );
            if (c.mode === "raw") {
                ParticleManager.SetParticleControl(p, 0, (left + Vector(0, 0, BEAM_Z)) as Vector);
                ParticleManager.SetParticleControl(p, 1, (right + Vector(0, 0, BEAM_Z)) as Vector);
            } else {
                for (const [cp, pos] of [[0, left], [1, right]] as [number, Vector][]) {
                    const anchor = CreateUnitByName(ANCHOR_UNIT, pos, false, undefined, undefined, DotaTeam.NEUTRALS);
                    if (!anchor || anchor.IsNull()) continue;
                    anchor.AddNewModifier(anchor, undefined, "modifier_invulnerable", {});
                    anchor.SetIdleAcquire(false);
                    anchor.Stop();
                    anchors.push(anchor);
                    ParticleManager.SetParticleControlEnt(
                        p, cp, anchor, ParticleAttachment.ABSORIGIN_FOLLOW,
                        "attach_hitloc", anchor.GetAbsOrigin(), true,
                    );
                }
            }
            particles.push(p);
            print(Marker.fxTestRow(i, c.mode, c.fx, y));
        });

        Timers.CreateTimer(PANEL_SECONDS, () => {
            for (const p of particles) {
                ParticleManager.DestroyParticle(p, false);
                ParticleManager.ReleaseParticleIndex(p);
            }
            for (const a of anchors) if (!a.IsNull()) a.RemoveSelf();
            print(Marker.fxTestDone(CANDIDATES.length));
        });
    });
}
