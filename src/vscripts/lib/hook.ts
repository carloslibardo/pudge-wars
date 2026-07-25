/**
 * Meat Hook geometry — pure 2D math, zero engine globals.
 *
 * The engine's `ProjectileManager` does the live collision at runtime (like the
 * template's example ability), but the SEMANTICS of a hook — which enemy counts
 * as "the first one hit", and how the drag walks a victim home — are encoded and
 * tested here so they are pinned on any laptop, in a millisecond, with no Dota
 * installed. `firstHookTarget` also lets the e2e bot aim: it only casts when a
 * straight hook would actually connect.
 *
 * All positions are `[x, y]`; hook combat is planar (z ignored), matching how
 * `example_ability` zeroes `diff.z` before normalizing.
 */
export type Vec2 = readonly [number, number];

/**
 * Distance between two planar points. `Math.hypot` is unsupported by
 * TypeScriptToLua (it errors the build), so we spell it out — this is the one
 * place the whole module computes length.
 */
function distance(ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
}

/** Unit vector from `from` toward `to`. Zero vector if the points coincide. */
export function hookDirection(from: Vec2, to: Vec2): [number, number] {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const len = distance(from[0], from[1], to[0], to[1]);
    if (len === 0) return [0, 0];
    return [dx / len, dy / len];
}

export interface HookCandidate {
    readonly id: number;
    readonly pos: Vec2;
}

/**
 * The first candidate a hook of `radius` width fired from `origin` along
 * (normalized) `dir` for `range` units would latch — i.e. the one nearest the
 * origin whose perpendicular distance to the ray is within `radius` and whose
 * projection lies in `[0, range]`. `undefined` if the hook would miss everyone
 * (the projectile reaches max distance untriggered).
 */
export function firstHookTarget(
    origin: Vec2,
    dir: Vec2,
    range: number,
    radius: number,
    candidates: readonly HookCandidate[],
): number | undefined {
    let bestId: number | undefined;
    let bestAlong = 0;
    for (const c of candidates) {
        const vx = c.pos[0] - origin[0];
        const vy = c.pos[1] - origin[1];
        const along = vx * dir[0] + vy * dir[1]; // projection onto the ray
        if (along < 0 || along > range) continue; // behind the caster or past max range
        const perpSq = vx * vx + vy * vy - along * along; // squared distance off the ray
        if (perpSq > radius * radius) continue; // outside the hook's width
        // nearest along the ray wins; `bestId === undefined` handles the first hit
        // without needing an Infinity sentinel (also TSTL-unsupported).
        if (bestId === undefined || along < bestAlong) {
            bestAlong = along;
            bestId = c.id;
        }
    }
    return bestId;
}

/**
 * One drag step of `stepDist` units from `current` toward `target`. Snaps
 * exactly to `target` when the remaining distance is within one step, so the
 * drag lands cleanly instead of oscillating past the caster.
 */
export function dragStep(current: Vec2, target: Vec2, stepDist: number): [number, number] {
    const dx = target[0] - current[0];
    const dy = target[1] - current[1];
    const dist = distance(current[0], current[1], target[0], target[1]);
    if (dist <= stepDist || dist === 0) return [target[0], target[1]];
    return [current[0] + (dx / dist) * stepDist, current[1] + (dy / dist) * stepDist];
}

/** Whether the victim is within `threshold` units of the caster — drag done. */
export function hasArrived(current: Vec2, target: Vec2, threshold: number): boolean {
    return distance(current[0], current[1], target[0], target[1]) <= threshold;
}

export interface HookBonus {
    readonly range: number;
    readonly speed: number;
    readonly damage: number;
}

/**
 * Sum the hook bonuses granted by shop items (spec 005). Each equipped hook item
 * contributes one `HookBonus`; Meat Hook adds the totals to its KV base values
 * when firing. Empty list (no hook items) → all zeros.
 */
export function sumHookBonuses(bonuses: readonly HookBonus[]): HookBonus {
    let range = 0;
    let speed = 0;
    let damage = 0;
    for (const b of bonuses) {
        range += b.range;
        speed += b.speed;
        damage += b.damage;
    }
    return { range, speed, damage };
}
