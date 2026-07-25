import { describe, expect, it } from "vitest";
import {
    dragStep,
    firstHookTarget,
    hasArrived,
    hookDirection,
    sumHookBonuses,
    type HookCandidate,
} from "../hook";

describe("hookDirection", () => {
    it("normalizes to a unit vector", () => {
        const [x, y] = hookDirection([0, 0], [3, 4]);
        expect(x).toBeCloseTo(0.6);
        expect(y).toBeCloseTo(0.8);
        expect(Math.hypot(x, y)).toBeCloseTo(1);
    });

    it("returns the zero vector for coincident points (no NaN)", () => {
        expect(hookDirection([5, 5], [5, 5])).toEqual([0, 0]);
    });
});

describe("firstHookTarget", () => {
    const enemies: HookCandidate[] = [
        { id: 1, pos: [500, 0] }, // dead on the ray, near
        { id: 2, pos: [900, 0] }, // dead on the ray, far
        { id: 3, pos: [300, 300] }, // way off the ray
    ];

    it("latches the nearest enemy along the ray", () => {
        expect(firstHookTarget([0, 0], [1, 0], 1100, 100, enemies)).toBe(1);
    });

    it("skips enemies outside the hook width", () => {
        // Only enemy 3 exists and it is 300 units off the ray, width 100 -> miss.
        expect(firstHookTarget([0, 0], [1, 0], 1100, 100, [enemies[2]])).toBeUndefined();
    });

    it("latches a target that is within the width but not centered", () => {
        const grazing: HookCandidate = { id: 9, pos: [400, 80] }; // 80 < 100 radius
        expect(firstHookTarget([0, 0], [1, 0], 1100, 100, [grazing])).toBe(9);
        const justOutside: HookCandidate = { id: 9, pos: [400, 120] }; // 120 > 100
        expect(firstHookTarget([0, 0], [1, 0], 1100, 100, [justOutside])).toBeUndefined();
    });

    it("ignores enemies beyond range and behind the caster", () => {
        const behind: HookCandidate = { id: 7, pos: [-500, 0] };
        const beyond: HookCandidate = { id: 8, pos: [2000, 0] };
        expect(firstHookTarget([0, 0], [1, 0], 1100, 100, [behind, beyond])).toBeUndefined();
    });
});

describe("dragStep / hasArrived", () => {
    it("moves one step toward the caster", () => {
        expect(dragStep([1000, 0], [0, 0], 250)).toEqual([750, 0]);
    });

    it("snaps to the target on the final step instead of overshooting", () => {
        expect(dragStep([100, 0], [0, 0], 250)).toEqual([0, 0]);
    });

    it("reports arrival within the threshold", () => {
        expect(hasArrived([40, 0], [0, 0], 50)).toBe(true);
        expect(hasArrived([120, 0], [0, 0], 50)).toBe(false);
    });
});

describe("sumHookBonuses", () => {
    it("is all zeros with no items", () => {
        expect(sumHookBonuses([])).toEqual({ range: 0, speed: 0, damage: 0 });
    });

    it("adds each field across equipped hook items", () => {
        expect(
            sumHookBonuses([
                { range: 250, speed: 400, damage: 40 },
                { range: 250, speed: 0, damage: 40 },
            ]),
        ).toEqual({ range: 500, speed: 400, damage: 80 });
    });
});
