import { describe, expect, it } from "vitest";
import { chooseGift, driftLeadY, driftStep, GIFT_KINDS, giftHunter, giftSpawnY } from "../riverGift";

describe("chooseGift", () => {
    it("splits [0,1) into three uniform bands", () => {
        expect(chooseGift(0)).toBe("gold");
        expect(chooseGift(0.32)).toBe("gold");
        expect(chooseGift(0.34)).toBe("heal");
        expect(chooseGift(0.65)).toBe("heal");
        expect(chooseGift(0.67)).toBe("item");
        expect(chooseGift(0.99)).toBe("item");
    });

    it("clamps out-of-range rolls instead of indexing past the table", () => {
        expect(chooseGift(1)).toBe("item");
        expect(chooseGift(1.5)).toBe("item");
        expect(chooseGift(-0.5)).toBe("gold");
    });

    it("covers exactly the three designed kinds", () => {
        expect(GIFT_KINDS).toEqual(["gold", "heal", "item"]);
    });
});

describe("giftSpawnY", () => {
    it("maps [0,1) across the full ±maxY band", () => {
        expect(giftSpawnY(0, 1400)).toBe(-1400);
        expect(giftSpawnY(0.5, 1400)).toBe(0);
        expect(giftSpawnY(1, 1400)).toBe(1400);
    });
});

describe("driftStep (spec 014 rev 2)", () => {
    it("advances along the drift direction by speed*dt", () => {
        expect(driftStep(0, 1, 120, 0.1, 1100)).toEqual({ y: 12, dir: 1 });
        expect(driftStep(0, -1, 120, 0.1, 1100)).toEqual({ y: -12, dir: -1 });
    });

    it("clamps and reverses at +maxY", () => {
        const step = driftStep(1095, 1, 120, 0.1, 1100);
        expect(step.y).toBe(1100);
        expect(step.dir).toBe(-1);
    });

    it("clamps and reverses at -maxY", () => {
        const step = driftStep(-1095, -1, 120, 0.1, 1100);
        expect(step.y).toBe(-1100);
        expect(step.dir).toBe(1);
    });

    it("round-trips: a reversed chest drifts back toward the middle", () => {
        const bounced = driftStep(1095, 1, 120, 0.1, 1100);
        const next = driftStep(bounced.y, bounced.dir, 120, 0.1, 1100);
        expect(next.y).toBe(1088);
        expect(next.dir).toBe(-1);
    });
});

describe("driftLeadY (spec 014 rev 2)", () => {
    it("leads by drift velocity over the hook's travel time", () => {
        // 1200 units at hook speed 1600 = 0.75 s; drifting +120 u/s → +90.
        expect(driftLeadY(200, 120, 1200, 1600)).toBe(290);
    });

    it("is a no-op for a parked chest (zero velocity)", () => {
        expect(driftLeadY(200, 0, 1200, 1600)).toBe(200);
    });

    it("is a no-op for a nonsense hook speed", () => {
        expect(driftLeadY(200, 120, 1200, 0)).toBe(200);
    });
});

describe("giftHunter", () => {
    it("picks the bot with the smallest |y - giftY|", () => {
        expect(giftHunter([-1000, -500, 0, 500, 1000], 620)).toBe(3);
    });

    it("breaks ties toward the lower index", () => {
        expect(giftHunter([-100, 100], 0)).toBe(0);
    });

    it("returns undefined for an empty roster", () => {
        expect(giftHunter([], 0)).toBeUndefined();
    });
});
