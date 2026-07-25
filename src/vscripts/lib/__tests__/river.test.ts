import { describe, expect, it } from "vitest";
import { isInRiver, riverRegenThisTick, type RiverBand } from "../river";

describe("isInRiver", () => {
    const xBand: RiverBand = { axis: "x", min: -400, max: 400 };

    it("is true inside the band and false outside (x axis)", () => {
        expect(isInRiver(0, 9999, xBand)).toBe(true); // y is irrelevant on an x-band
        expect(isInRiver(401, 0, xBand)).toBe(false);
        expect(isInRiver(-401, 0, xBand)).toBe(false);
    });

    it("treats the bounds as inclusive", () => {
        expect(isInRiver(-400, 0, xBand)).toBe(true);
        expect(isInRiver(400, 0, xBand)).toBe(true);
    });

    it("switches the tested coordinate by axis", () => {
        const yBand: RiverBand = { axis: "y", min: -400, max: 400 };
        expect(isInRiver(9999, 0, yBand)).toBe(true); // x irrelevant on a y-band
        expect(isInRiver(0, 500, yBand)).toBe(false);
    });
});

describe("riverRegenThisTick", () => {
    it("multiplies regen by the tick length", () => {
        expect(riverRegenThisTick(30, 0.25)).toBeCloseTo(7.5);
        expect(riverRegenThisTick(30, 0)).toBe(0);
    });
});
