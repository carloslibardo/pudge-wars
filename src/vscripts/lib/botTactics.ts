/**
 * Bot tactics (spec 009) — pure ports from the archer-wars bot engine.
 *
 * Target scoring, retreat, per-bot personas and intercept aim, all with the
 * archer numbers (cited in the spec) and zero Dota globals. Randomness is a
 * seeded PRNG so behavior is deterministic per (player, tick).
 */
export type Vec2 = readonly [number, number];

export interface TargetCandidate {
    readonly id: number;
    readonly pos: Vec2;
    readonly hpPct: number;
}

/** Archer targetSelect weights, verbatim. */
export function targetScore(selfPos: Vec2, c: TargetCandidate, currentTargetId?: number): number {
    const dx = c.pos[0] - selfPos[0];
    const dy = c.pos[1] - selfPos[1];
    let score = -Math.sqrt(dx * dx + dy * dy) / 1000 + (1 - c.hpPct) * 1.2;
    if (c.hpPct <= 0.25) score += 0.8; // finisher
    if (currentTargetId !== undefined && c.id === currentTargetId) score += 0.4; // stickiness
    return score;
}

export function pickTarget(
    selfPos: Vec2,
    candidates: readonly TargetCandidate[],
    currentTargetId?: number,
): number | undefined {
    let best: number | undefined;
    let bestScore = 0;
    for (const c of candidates) {
        const s = targetScore(selfPos, c, currentTargetId);
        if (best === undefined || s > bestScore) {
            best = c.id;
            bestScore = s;
        }
    }
    return best;
}

/** Archer medium-tier retreat threshold. */
export const RETREAT_HP_PCT = 0.35;
/** How much deeper than the bank hold line a retreating bot stands. */
export const RETREAT_DEPTH = 700;

export function shouldRetreat(hpPct: number, enemyVisible: boolean): boolean {
    return enemyVisible && hpPct < RETREAT_HP_PCT;
}

/** 32-bit multiply via 16-bit split — TSTL rejects Math.imul (like Math.hypot),
 *  and a naive `a * b` overflows double precision at 2^64. Archer's imul32. */
export function imul32(a: number, b: number): number {
    const aHi = (a >>> 16) & 0xffff;
    const aLo = a & 0xffff;
    const bHi = (b >>> 16) & 0xffff;
    const bLo = b & 0xffff;
    return (aLo * bLo + (((aHi * bLo + aLo * bHi) << 16) >>> 0)) | 0;
}

/** mulberry32 (archer persona.ts) — deterministic per-bot PRNG. */
export function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = imul32(t ^ (t >>> 15), t | 1);
        t ^= t + imul32(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export interface Persona {
    /** Strafe amplitude, 90–150. */
    readonly amplitude: number;
    /** Strafe period in thinks, 3–6. */
    readonly period: number;
    /** Phase offset in thinks. */
    readonly phase: number;
    /** 0.9–1.1 — scales engagement distance preferences. */
    readonly aggression: number;
}

export function personaFor(playerId: number): Persona {
    const rng = mulberry32(0x9e3779b9 ^ imul32(playerId, 2654435761));
    return {
        amplitude: 90 + Math.floor(rng() * 61),
        period: 3 + Math.floor(rng() * 4),
        phase: Math.floor(rng() * 7),
        aggression: 0.9 + rng() * 0.2,
    };
}

/** Persona-flavored strafe: square wave with per-bot amplitude/period/phase. */
export function personaStrafe(tick: number, p: Persona): number {
    const t = tick + p.phase;
    const phase = ((t % p.period) + p.period) % p.period;
    return phase < p.period / 2 ? p.amplitude : -p.amplitude;
}

/** Deterministic dodge roll (archer medium dodgeChance = 0.75). */
export function dodgeRoll(playerId: number, tick: number, chance = 0.75): boolean {
    return mulberry32(playerId * 1000003 + tick)() < chance;
}

/** Speed above this is a hook/teleport, not walking — drop the velocity. */
export const VELOCITY_DISCONTINUITY = 700;

/**
 * Velocity estimate from two position samples `dt` apart, with the archer
 * discontinuity filter: an impossible speed returns [0, 0] rather than
 * leading a shot into empty ground.
 */
export function estimateVelocity(prev: Vec2 | undefined, cur: Vec2, dt: number): [number, number] {
    if (!prev || dt <= 0) return [0, 0];
    const vx = (cur[0] - prev[0]) / dt;
    const vy = (cur[1] - prev[1]) / dt;
    if (Math.sqrt(vx * vx + vy * vy) > VELOCITY_DISCONTINUITY) return [0, 0];
    return [vx, vy];
}

/**
 * First-order intercept (archer aim.ts, verbatim math): where to aim a
 * projectile of `speed` from `origin` at a target moving with `vel` from
 * `targetPos`. Falls back to the current position when there is no positive
 * root or the intercept is over 3 s out.
 */
export function interceptPoint(
    origin: Vec2,
    targetPos: Vec2,
    vel: Vec2,
    speed: number,
): [number, number] {
    const rx = targetPos[0] - origin[0];
    const ry = targetPos[1] - origin[1];
    const a = vel[0] * vel[0] + vel[1] * vel[1] - speed * speed;
    const b = 2 * (rx * vel[0] + ry * vel[1]);
    const c = rx * rx + ry * ry;
    let t: number | undefined;
    if (Math.abs(a) < 1e-6) {
        if (Math.abs(b) > 1e-6) t = -c / b;
    } else {
        const disc = b * b - 4 * a * c;
        if (disc >= 0) {
            const sq = Math.sqrt(disc);
            const t1 = (-b - sq) / (2 * a);
            const t2 = (-b + sq) / (2 * a);
            t = t1 > 0 ? t1 : t2 > 0 ? t2 : undefined;
        }
    }
    if (t === undefined || t <= 0 || t > 3) return [targetPos[0], targetPos[1]];
    return [targetPos[0] + vel[0] * t, targetPos[1] + vel[1] * t];
}
