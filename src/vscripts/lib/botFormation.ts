/**
 * Bank formation for the e2e bots (spec 007) — pure, zero engine globals.
 *
 * Run 12's executor made every bot mirror its NEAREST ENEMY's Y — a positive
 * feedback loop that collapsed each team into one motionless stack within 30 s.
 * The fix is an ANCHOR per bot (its spawn slot on the bank) that the bot never
 * abandons: it tracks its target only within a clamp around that anchor, and
 * strafes around the result on a fixed period so it is never standing still.
 */
import { battleLinePosition, type Side } from "./battleLines";

export const TRACK_CLAMP = 250;
export const STRAFE_AMPLITUDE = 120;
/** Thinks per full strafe cycle (0.5 s thinks → 2 s period). */
export const STRAFE_PERIOD = 4;

/** The Y a bot is anchored to: its spawn slot's Y (spec 001 geometry). */
export function anchorY(slotInTeam: number, perTeam: number, spacing: number): number {
    // Side/lineX don't affect Y; reuse the one spawn-geometry source of truth.
    return battleLinePosition(1 as Side, slotInTeam, perTeam, 0, spacing)[1];
}

/** Square-wave strafe: +amplitude for the first half of the period, −amplitude after. */
export function strafeOffset(tick: number, amplitude: number, period: number): number {
    const phase = ((tick % period) + period) % period;
    return phase < period / 2 ? amplitude : -amplitude;
}

/**
 * Where the bot should stand this think: its anchor, nudged toward the
 * target's Y by at most `TRACK_CLAMP`, plus the strafe. The anchor term keeps
 * the team spread; the clamp keeps tracking from re-creating the collapse.
 */
export function holdY(anchor: number, targetY: number, tick: number): number {
    const track = Math.max(-TRACK_CLAMP, Math.min(TRACK_CLAMP, targetY - anchor));
    return anchor + track + strafeOffset(tick, STRAFE_AMPLITUDE, STRAFE_PERIOD);
}
