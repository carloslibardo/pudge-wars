import { describe, expect, it } from "vitest";
import { nextAbilitySlot } from "../botSkillPlan";

const MAXES = [4, 4, 3]; // hook, rot, flesh heap

describe("nextAbilitySlot", () => {
    it("spends the first point on hook (slot 0 wins the all-zero tie)", () => {
        expect(nextAbilitySlot([0, 0, 0], MAXES)).toBe(0);
    });

    it("levels rot and flesh before hook 2 — spread, not slot order", () => {
        expect(nextAbilitySlot([1, 0, 0], MAXES)).toBe(1);
        expect(nextAbilitySlot([1, 1, 0], MAXES)).toBe(2);
        expect(nextAbilitySlot([1, 1, 1], MAXES)).toBe(0);
    });

    it("skips maxed slots", () => {
        expect(nextAbilitySlot([4, 4, 1], MAXES)).toBe(2);
        expect(nextAbilitySlot([4, 1, 3], MAXES)).toBe(1);
    });

    it("returns undefined when everything is maxed", () => {
        expect(nextAbilitySlot([4, 4, 3], MAXES)).toBeUndefined();
    });

    it("treats a missing slot (level >= max 0) as unlevelable", () => {
        expect(nextAbilitySlot([0, 0], [0, 4])).toBe(1);
    });
});
