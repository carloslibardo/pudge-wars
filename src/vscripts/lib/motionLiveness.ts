/**
 * Motion liveness accounting (spec 007) — pure, zero engine globals.
 *
 * The harness samples every bot's position each think and accumulates the
 * distance travelled; each window it audits the totals. A bot that travels
 * less than the stuck threshold over a full window is STUCK — the exact
 * failure run 12's video showed while every marker gate was green.
 */
export type Vec2 = readonly [number, number];

/** Threshold under which a full window's travel counts as stuck. */
export const STUCK_THRESHOLD = 300;
/** Liveness window length in thinks (0.5 s thinks → 30 s). */
export const AUDIT_WINDOW_THINKS = 60;

/** New travel total after moving from `prev` to `next` (prev unknown → unchanged). */
export function addTravel(travel: number, prev: Vec2 | undefined, next: Vec2): number {
    if (!prev) return travel;
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    return travel + Math.sqrt(dx * dx + dy * dy);
}

export function isStuck(travel: number, threshold: number): boolean {
    return travel < threshold;
}
