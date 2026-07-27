/**
 * Which ability slot should an e2e bot spend its next point on?
 *
 * Lowest level first, earlier slot on ties (hook > rot > flesh heap). The
 * first harness leveled strictly by slot order, which maxed Meat Hook before
 * touching anything else — Rot sat at level 0 the whole run, was never
 * castable, and the smoke produced zero [ROT] ticks (2026-07-27 run 4).
 * Spreading points levels every ability to 1 early, so all three systems
 * produce tier-2 evidence.
 *
 * Pure — levels/maxLevels are plain arrays, so this is unit-tested on Node.
 */
export function nextAbilitySlot(
    levels: readonly number[],
    maxLevels: readonly number[],
): number | undefined {
    let best: number | undefined;
    for (let i = 0; i < levels.length; i++) {
        if (levels[i] >= maxLevels[i]) continue;
        if (best === undefined || levels[i] < levels[best]) best = i;
    }
    return best;
}
