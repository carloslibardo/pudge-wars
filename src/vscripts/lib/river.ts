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
 * River hazard DPS for a hero whose CONTINUOUS in-band exposure is `exposure`
 * seconds (spec 012). Zero within grace; then base DPS plus a ramp per full
 * second over grace, capped. Exposure accounting (and its pause while
 * motion-controlled) is the modifier's job — this is just the curve.
 */
export function riverHazardDps(
    exposure: number,
    grace: number,
    dps: number,
    ramp: number,
    cap: number,
): number {
    if (exposure <= grace) return 0;
    return Math.min(dps + ramp * Math.floor(exposure - grace), cap);
}

/**
 * Damage the hazard may actually apply this tick: the curve's tick share,
 * clamped so the victim NEVER drops below 1 HP (decision 2026-07-29: a river
 * death would read as a suicide and rob the hooking team of its kill).
 */
export function riverHazardTickDamage(dpsNow: number, tickSeconds: number, currentHp: number): number {
    return Math.max(0, Math.min(dpsNow * tickSeconds, currentHp - 1));
}
