import { describe, expect, it } from "vitest";
import {
    dodgeRoll,
    estimateVelocity,
    interceptPoint,
    personaFor,
    personaStrafe,
    pickTarget,
    retreatState,
    shouldRetreat,
    targetScore,
} from "../botTactics";

describe("target selection (archer weights)", () => {
    it("prefers the wounded target over the near one", () => {
        // 1200 units of extra distance ≈ the full HP swing of 1.2
        const near = { id: 1, pos: [500, 0] as const, hpPct: 1 };
        const hurt = { id: 2, pos: [1400, 0] as const, hpPct: 0.2 };
        expect(pickTarget([0, 0], [near, hurt])).toBe(2);
    });

    it("applies stickiness to the current target", () => {
        const a = { id: 1, pos: [500, 0] as const, hpPct: 0.8 };
        const b = { id: 2, pos: [500, 100] as const, hpPct: 0.75 };
        expect(pickTarget([0, 0], [a, b], 1)).toBe(1);
        expect(targetScore([0, 0], a, 1)).toBeGreaterThan(targetScore([0, 0], a));
    });
});

describe("retreat", () => {
    it("fires under 35% HP only with an enemy visible", () => {
        expect(shouldRetreat(0.3, true)).toBe(true);
        expect(shouldRetreat(0.3, false)).toBe(false);
        expect(shouldRetreat(0.5, true)).toBe(false);
    });

    it("holds the retreat until healed past the exit threshold (hysteresis)", () => {
        expect(retreatState(false, 0.3, true)).toBe(true); // enter
        expect(retreatState(true, 0.4, true)).toBe(true); // 40% — stay out (run 15 flapped here)
        expect(retreatState(true, 0.6, true)).toBe(false); // healed — rejoin
        expect(retreatState(false, 0.4, true)).toBe(false); // never entered
        expect(retreatState(true, 0.2, false)).toBe(false); // nobody visible
    });
});

describe("personas", () => {
    it("gives different bots different rhythms, deterministically", () => {
        const a = personaFor(1);
        const b = personaFor(2);
        expect(personaFor(1)).toEqual(a);
        expect([a.amplitude, a.period, a.phase]).not.toEqual([b.amplitude, b.period, b.phase]);
        expect(a.amplitude).toBeGreaterThanOrEqual(90);
        expect(a.amplitude).toBeLessThanOrEqual(150);
    });

    it("strafe oscillates with the persona's own amplitude", () => {
        const p = personaFor(3);
        const values = new Set([0, 1, 2, 3, 4, 5, 6, 7].map(t => personaStrafe(t, p)));
        expect(values).toEqual(new Set([p.amplitude, -p.amplitude]));
    });

    it("dodge roll is deterministic and ~75% over many ticks", () => {
        let hits = 0;
        for (let t = 0; t < 400; t++) if (dodgeRoll(5, t)) hits++;
        expect(dodgeRoll(5, 7)).toBe(dodgeRoll(5, 7));
        expect(hits / 400).toBeGreaterThan(0.65);
        expect(hits / 400).toBeLessThan(0.85);
    });
});

describe("intercept aim", () => {
    it("leads a strafing target", () => {
        const [x, y] = interceptPoint([0, 0], [900, 0], [0, 300], 1500);
        expect(x).toBe(900);
        expect(y).toBeGreaterThan(150); // ~0.62s flight → ~187 of lead
        expect(y).toBeLessThan(250);
    });

    it("falls back to the current position for a stationary target", () => {
        expect(interceptPoint([0, 0], [900, 0], [0, 0], 1500)).toEqual([900, 0]);
    });

    it("drops discontinuous velocity instead of leading into empty ground", () => {
        expect(estimateVelocity([0, 0], [1000, 0], 0.5)).toEqual([0, 0]); // 2000 u/s: a drag
        expect(estimateVelocity([0, 0], [150, 0], 0.5)).toEqual([300, 0]);
        expect(estimateVelocity(undefined, [150, 0], 0.5)).toEqual([0, 0]);
    });
});
