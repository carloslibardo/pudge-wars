import { describe, expect, it } from "vitest";
import {
    holdThinks,
    reachedWaypoint,
    ROAM_SPACING_SHIFT,
    roamMood,
    roamWaypoint,
    type RoamBounds,
} from "../botRoam";
import { mulberry32 } from "../botTactics";

const BOUNDS: RoamBounds = { bankX: 450, maxX: 2400, maxY: 2000 };

describe("roamMood", () => {
    it("splits push/poke/lurk by roll", () => {
        expect(roamMood(0.0, 1)).toBe("push");
        expect(roamMood(0.44, 1)).toBe("push");
        expect(roamMood(0.46, 1)).toBe("poke");
        expect(roamMood(0.79, 1)).toBe("poke");
        expect(roamMood(0.81, 1)).toBe("lurk");
    });
    it("aggression widens the push band", () => {
        // roll 0.47 is poke at aggression 1.0 but push at 1.1 (0.45*1.1=0.495)
        expect(roamMood(0.47, 1.0)).toBe("poke");
        expect(roamMood(0.47, 1.1)).toBe("push");
    });
});

describe("roamWaypoint", () => {
    it("respects the mood X bands and the side sign", () => {
        const rng = mulberry32(7);
        for (let i = 0; i < 200; i++) {
            const [px] = roamWaypoint(rng, -1, BOUNDS, "push", []);
            expect(px).toBeLessThanOrEqual(-BOUNDS.bankX);
            expect(px).toBeGreaterThanOrEqual(-(BOUNDS.bankX + 250));
            const [lx] = roamWaypoint(rng, 1, BOUNDS, "lurk", []);
            expect(lx).toBeGreaterThanOrEqual(BOUNDS.bankX + 900);
            expect(lx).toBeLessThanOrEqual(BOUNDS.maxX);
        }
    });
    it("keeps Y inside the roam area", () => {
        const rng = mulberry32(11);
        for (let i = 0; i < 200; i++) {
            const [, y] = roamWaypoint(rng, 1, BOUNDS, "poke", []);
            expect(Math.abs(y)).toBeLessThanOrEqual(BOUNDS.maxY);
        }
    });
    it("repels away from a crowding teammate", () => {
        // Deterministic rng: X mid-band, Y exactly at the mate's Y.
        const fixed = [0.5, 0.5][Symbol.iterator]();
        const rng = () => fixed.next().value ?? 0.5;
        const mateFree = roamWaypoint(() => 0.5, 1, BOUNDS, "poke", []);
        const crowded = roamWaypoint(() => 0.5, 1, BOUNDS, "poke", [mateFree]);
        expect(Math.abs(crowded[1] - mateFree[1])).toBe(ROAM_SPACING_SHIFT);
        void rng;
    });
    it("is deterministic under a seeded rng", () => {
        expect(roamWaypoint(mulberry32(42), 1, BOUNDS, "push", [])).toEqual(
            roamWaypoint(mulberry32(42), 1, BOUNDS, "push", []),
        );
    });
});

describe("reachedWaypoint / holdThinks", () => {
    it("arrives within 150 units", () => {
        expect(reachedWaypoint([0, 0], [100, 100])).toBe(true);
        expect(reachedWaypoint([0, 0], [200, 100])).toBe(false);
    });
    it("converts persona period to thinks", () => {
        expect(holdThinks(3, 0.5)).toBe(6);
        expect(holdThinks(6, 0.5)).toBe(12);
        expect(holdThinks(0.1, 0.5)).toBe(1);
    });
});
