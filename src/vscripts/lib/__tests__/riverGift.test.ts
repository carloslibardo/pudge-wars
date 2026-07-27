import { describe, expect, it } from "vitest";
import { chooseGift, GIFT_KINDS, giftHunter, giftSpawnY } from "../riverGift";

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
