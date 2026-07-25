/**
 * River-band membership — a coordinate check, deliberately NOT map geometry.
 *
 * The river is a band between two world coordinates on one axis (the mid-map
 * strip between the two teams). Whether a hero is "in the river" is a pure
 * numeric test, so it is defined and tested here; `systems/riverBand.ts` only
 * scans heroes and toggles the buff modifier based on this answer. Bounds are
 * inclusive: a hero exactly on the edge counts as in.
 */
export interface RiverBand {
    readonly axis: "x" | "y";
    readonly min: number;
    readonly max: number;
}

export function isInRiver(x: number, y: number, band: RiverBand): boolean {
    const coord = band.axis === "x" ? x : y;
    return coord >= band.min && coord <= band.max;
}

/**
 * HP the river heals over one scan tick, given the per-second regen bonus. The
 * modifier grants regen as a continuous property in-engine; this is the closed
 * form the test (and any tick-based accounting) uses.
 */
export function riverRegenThisTick(regenPerSecond: number, tickSeconds: number): number {
    return regenPerSecond * tickSeconds;
}
