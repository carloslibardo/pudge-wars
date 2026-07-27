import { describe, expect, it } from "vitest";
import { nextPurchase, shoppingPreference } from "../botShopping";
import { SHOP_ITEMS } from "../shop";

describe("shoppingPreference", () => {
    it("rotates the catalog by seat so bots diversify", () => {
        expect(shoppingPreference(0).map(i => i.name)).toEqual(SHOP_ITEMS.map(i => i.name));
        expect(shoppingPreference(2)[0].name).toBe(SHOP_ITEMS[2].name);
        expect(shoppingPreference(2)).toHaveLength(SHOP_ITEMS.length);
    });

    it("wraps seats past the catalog size", () => {
        expect(shoppingPreference(7)[0].name).toBe(SHOP_ITEMS[1].name);
    });
});

describe("nextPurchase", () => {
    it("buys the seat's preferred item when affordable", () => {
        const pick = nextPurchase({ gold: 600, owned: {} }, 0);
        expect(pick?.item.name).toBe("item_pudge_hook_chain");
        expect(pick?.state.gold).toBe(0);
        expect(pick?.state.owned["item_pudge_hook_chain"]).toBe(1);
    });

    it("falls through to a cheaper item when the preferred is unaffordable", () => {
        // Seat 5 prefers gut_stitch (900); with 500 gold the pick must be a
        // later, affordable entry in its rotation.
        const pick = nextPurchase({ gold: 500, owned: {} }, 5);
        expect(pick).toBeDefined();
        expect(pick!.item.cost).toBeLessThanOrEqual(500);
    });

    it("respects stack caps via the shared purchase() rule", () => {
        const pick = nextPurchase({ gold: 9999, owned: { item_pudge_hook_chain: 3 } }, 0);
        expect(pick?.item.name).not.toBe("item_pudge_hook_chain");
    });

    it("returns undefined when nothing is affordable", () => {
        expect(nextPurchase({ gold: 100, owned: {} }, 0)).toBeUndefined();
    });
});
