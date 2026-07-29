/**
 * Roaming movement (spec 012) — the anti-"robotic" engine. Instead of holding
 * a formation anchor, each bot walks between self-chosen waypoints in its own
 * field. A waypoint has a MOOD:
 *
 *   push — hug the bank, threaten hooks (the aggressive line)
 *   poke — mid-field, in and out of hook range
 *   lurk — deep field, bait and reposition
 *
 * The mix is aggression-weighted per persona, and waypoints repel away from
 * nearby teammates so the team spreads instead of forming a picket line.
 *
 * Pure: randomness is injected as `() => number` in [0,1).
 */

export type RoamMood = "push" | "poke" | "lurk";

export interface RoamBounds {
    /** Closest allowed X to the river (own-bank hold line). */
    readonly bankX: number;
    /** Deepest allowed X. */
    readonly maxX: number;
    /** |Y| bound of the roam area. */
    readonly maxY: number;
}

/** Distance under which a waypoint is biased away from a teammate. */
export const ROAM_SPACING = 350;
/** How far the Y is pushed when a teammate crowds the pick. */
export const ROAM_SPACING_SHIFT = 400;
/** A bot within this range of its waypoint counts as arrived. */
export const ROAM_ARRIVE = 150;

/** Mood X-bands relative to bankX (distances from the river, own side). */
const PUSH_DEPTH = 250;
const POKE_MIN = 300;
const POKE_MAX = 900;

/**
 * Pick a mood from one roll. Base mix push 45 / poke 35 / lurk 20, with the
 * push share scaled by the persona's aggression (0.9–1.1, spec 009) — hot
 * heads push more, cautious bots lurk more.
 */
export function roamMood(roll: number, aggression: number): RoamMood {
    const push = 0.45 * aggression;
    if (roll < push) return "push";
    if (roll < push + 0.35) return "poke";
    return "lurk";
}

/**
 * Pick the next waypoint for `side` (-1 left field, +1 right) given the mood
 * and the OTHER teammates' positions. Two rolls: X within the mood band, Y
 * uniform in ±maxY; if the pick lands within ROAM_SPACING of a teammate, its
 * Y shifts away by ROAM_SPACING_SHIFT (clamped to the roam area).
 */
export function roamWaypoint(
    rand: () => number,
    side: -1 | 1,
    bounds: RoamBounds,
    mood: RoamMood,
    mates: ReadonlyArray<readonly [number, number]>,
): [number, number] {
    let lo: number;
    let hi: number;
    if (mood === "push") {
        lo = bounds.bankX;
        hi = bounds.bankX + PUSH_DEPTH;
    } else if (mood === "poke") {
        lo = bounds.bankX + POKE_MIN;
        hi = bounds.bankX + POKE_MAX;
    } else {
        lo = bounds.bankX + POKE_MAX;
        hi = bounds.maxX;
    }
    const x = side * (lo + rand() * (hi - lo));
    let y = -bounds.maxY + rand() * (2 * bounds.maxY);

    for (const [mx, my] of mates) {
        const dx = x - mx;
        const dy = y - my;
        if (Math.sqrt(dx * dx + dy * dy) < ROAM_SPACING) {
            y += dy >= 0 ? ROAM_SPACING_SHIFT : -ROAM_SPACING_SHIFT;
            y = Math.max(-bounds.maxY, Math.min(bounds.maxY, y));
            break;
        }
    }
    return [x, y];
}

/** Arrived at the waypoint? */
export function reachedWaypoint(pos: readonly [number, number], wp: readonly [number, number]): boolean {
    const dx = pos[0] - wp[0];
    const dy = pos[1] - wp[1];
    return Math.sqrt(dx * dx + dy * dy) <= ROAM_ARRIVE;
}

/** How many thinks a waypoint is held before a forced repick. */
export function holdThinks(periodSeconds: number, thinkInterval: number): number {
    return Math.max(1, Math.round(periodSeconds / thinkInterval));
}
