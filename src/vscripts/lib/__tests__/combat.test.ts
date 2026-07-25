import { describe, expect, it } from "vitest";
import { fleshHeapBonus, rotSelfDamage } from "../combat";

describe("rotSelfDamage", () => {
    it("deals the full self-damage when it is survivable", () => {
        expect(rotSelfDamage(500, 15)).toBe(15);
    });

    it("never takes Pudge below 1 HP", () => {
        expect(rotSelfDamage(10, 15)).toBe(9); // 10 -> 1, not 10 -> -5
        expect(rotSelfDamage(1, 15)).toBe(0); // already at the floor
    });

    it("is a no-op at or below 1 HP (Rot can't suicide)", () => {
        expect(rotSelfDamage(1, 999)).toBe(0);
        expect(rotSelfDamage(0, 999)).toBe(0);
    });
});

describe("fleshHeapBonus", () => {
    it("is zero at zero stacks", () => {
        expect(fleshHeapBonus(0, 40, 0.006, 0.6)).toEqual({ bonusHp: 0, resistPct: 0 });
    });

    it("scales HP linearly and resist per stack", () => {
        const b = fleshHeapBonus(5, 40, 0.006, 0.6);
        expect(b.bonusHp).toBe(200);
        expect(b.resistPct).toBeCloseTo(0.03);
    });

    it("caps magic resistance", () => {
        // 200 stacks * 0.006 = 1.2, well over the 0.6 cap.
        expect(fleshHeapBonus(200, 40, 0.006, 0.6).resistPct).toBe(0.6);
        expect(fleshHeapBonus(200, 40, 0.006, 0.6).bonusHp).toBe(8000); // HP still uncapped
    });

    it("treats negative stacks as zero", () => {
        expect(fleshHeapBonus(-3, 40, 0.006, 0.6)).toEqual({ bonusHp: 0, resistPct: 0 });
    });
});
