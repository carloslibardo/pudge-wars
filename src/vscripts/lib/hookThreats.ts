/**
 * Hook threat registry + dodge geometry (spec 009) — pure, zero engine globals.
 *
 * Dota exposes no Lua API to enumerate in-flight projectiles, so every Meat
 * Hook self-registers here at launch (archer-wars arrowTracker pattern). The
 * dodge math is the archer `dodge.ts` closest-approach test, verbatim: reject
 * threats that are already past, land short, pass wide, or are more than
 * 1.5 s out; escape by stepping perpendicular on the side you're already on.
 */
export type Vec2 = readonly [number, number];

export interface HookThreat {
    readonly origin: Vec2;
    /** Normalized flight direction. */
    readonly dir: Vec2;
    readonly speed: number;
    /** Max travel distance — the hook's range. */
    readonly range: number;
    /** Collision half-width of the hook. */
    readonly radius: number;
    readonly firedAt: number;
    readonly team: number;
}

/** Rough hero hull clearance added to the hook's own radius. */
export const SELF_RADIUS = 60;
/** Threats further out than this are ignored (archer dodge.ts). */
export const MAX_TIME_TO_IMPACT = 1.5;
/** Perpendicular escape step (archer dodge.ts). */
export const DODGE_STEP = 250;
/** Reaction delay before a bot may "see" a threat (medium tier).
 *  Run 34: at hook speed 2400 and range 1100 the whole flight is 0.458 s —
 *  the old 0.4 s delay left a ≤0.06 s dodge window sampled on a 0.5 s think,
 *  so [DODGE] flatlined. 0.15 s keeps the reflex honest AND reachable. */
export const REACTION_SECONDS = 0.15;

const registry: HookThreat[] = [];

/** Register a hook at launch. Engine code calls this from OnSpellStart. */
export function trackHook(threat: HookThreat): void {
    registry.push(threat);
}

export function threatExpired(t: HookThreat, now: number): boolean {
    return (now - t.firedAt) * t.speed > t.range;
}

/** Live threats, pruning expired ones in place. */
export function activeThreats(now: number): readonly HookThreat[] {
    for (let i = registry.length - 1; i >= 0; i--) {
        if (threatExpired(registry[i], now)) registry.splice(i, 1);
    }
    return registry;
}

/** Test seam: clear module state between vitest cases. */
export function resetThreats(): void {
    registry.length = 0;
}

/**
 * The most urgent enemy hook that will hit `selfPos`, or undefined. A threat
 * is visible only `reaction` seconds after launch (fairness gate) and only if
 * the closest-approach test says it connects within MAX_TIME_TO_IMPACT.
 */
export function incomingThreat(
    selfPos: Vec2,
    selfTeam: number,
    threats: readonly HookThreat[],
    now: number,
    reaction: number = REACTION_SECONDS,
): HookThreat | undefined {
    let best: HookThreat | undefined;
    let bestImpact = 0;
    for (const t of threats) {
        if (t.team === selfTeam) continue;
        if (now - t.firedAt < reaction) continue;
        const travelled = (now - t.firedAt) * t.speed;
        const px = t.origin[0] + t.dir[0] * travelled;
        const py = t.origin[1] + t.dir[1] * travelled;
        const toSelfX = selfPos[0] - px;
        const toSelfY = selfPos[1] - py;
        const along = toSelfX * t.dir[0] + toSelfY * t.dir[1];
        if (along <= 0) continue; // already past us
        if (along > t.range - travelled) continue; // lands short
        const cross = t.dir[0] * toSelfY - t.dir[1] * toSelfX;
        if (Math.abs(cross) >= t.radius + SELF_RADIUS) continue; // passes wide
        const timeToImpact = along / t.speed;
        if (timeToImpact > MAX_TIME_TO_IMPACT) continue;
        if (best === undefined || timeToImpact < bestImpact) {
            best = t;
            bestImpact = timeToImpact;
        }
    }
    return best;
}

/** Escape point: perpendicular to the hook line, on the nearer exit side. */
export function dodgeStep(selfPos: Vec2, t: HookThreat, step: number = DODGE_STEP): [number, number] {
    const toSelfX = selfPos[0] - t.origin[0];
    const toSelfY = selfPos[1] - t.origin[1];
    const cross = t.dir[0] * toSelfY - t.dir[1] * toSelfX;
    const side = cross >= 0 ? 1 : -1;
    // Perpendicular of (dx,dy) on `side`: side * (-dy, dx).
    return [selfPos[0] - side * t.dir[1] * step, selfPos[1] + side * t.dir[0] * step];
}
