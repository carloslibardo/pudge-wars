import { describe, expect, it } from "vitest";
import { isInRiver, riverHazardDps, riverHazardTickDamage, type RiverBand } from "../river";

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

describe("riverHazardDps (spec 012)", () => {
    it("is zero within grace — the honest crossing is free", () => {
        expect(riverHazardDps(0, 4, 30, 10, 80)).toBe(0);
        expect(riverHazardDps(4, 4, 30, 10, 80)).toBe(0);
    });
    it("starts at base DPS and ramps per full second past grace", () => {
        expect(riverHazardDps(4.5, 4, 30, 10, 80)).toBe(30);
        expect(riverHazardDps(5, 4, 30, 10, 80)).toBe(40);
        expect(riverHazardDps(7, 4, 30, 10, 80)).toBe(60);
    });
    it("caps", () => {
        expect(riverHazardDps(60, 4, 30, 10, 80)).toBe(80);
    });
});

describe("riverHazardTickDamage (spec 012)", () => {
    it("takes the tick share of the DPS", () => {
        expect(riverHazardTickDamage(30, 0.5, 500)).toBe(15);
    });
    it("NEVER drops the victim below 1 HP", () => {
        expect(riverHazardTickDamage(80, 0.5, 30)).toBe(29);
        expect(riverHazardTickDamage(80, 0.5, 1)).toBe(0);
    });
});
