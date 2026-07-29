import { describe, expect, it } from "vitest";
import { canAfford, findItem, purchase, SHOP_ITEMS, type PurchaseState } from "../shop";

describe("catalog", () => {
    it("has the hook-fantasy catalog with unique names and positive costs", () => {
        expect(SHOP_ITEMS).toHaveLength(7);
        const names = new Set(SHOP_ITEMS.map(i => i.name));
        expect(names.size).toBe(7);
        for (const item of SHOP_ITEMS) {
            expect(item.cost).toBeGreaterThan(0);
            expect(item.maxStacks).toBeGreaterThanOrEqual(1);
            expect(item.name.startsWith("item_pudge_")).toBe(true);
        }
    });
});

describe("canAfford", () => {
    it("compares gold to cost", () => {
        const chain = findItem("item_pudge_hook_chain")!;
        expect(canAfford(600, chain)).toBe(true);
        expect(canAfford(599, chain)).toBe(false);
    });
});

describe("purchase", () => {
    const fresh: PurchaseState = { gold: 2000, owned: {} };

    it("debits gold and records the item on success", () => {
        const r = purchase(fresh, "item_pudge_hook_chain");
        expect(r.ok).toBe(true);
        expect(r.state.gold).toBe(1400);
        expect(r.state.owned["item_pudge_hook_chain"]).toBe(1);
        // input untouched (pure)
        expect(fresh.gold).toBe(2000);
        expect(fresh.owned).toEqual({});
    });

    it("rejects an unknown item", () => {
        expect(purchase(fresh, "item_nonexistent")).toMatchObject({
            ok: false,
            reason: "unknown_item",
        });
    });

    it("rejects when gold is short", () => {
        const broke: PurchaseState = { gold: 100, owned: {} };
        expect(purchase(broke, "item_pudge_hook_chain")).toMatchObject({
            ok: false,
            reason: "insufficient_gold",
        });
    });

    it("enforces the per-item stack cap", () => {
        // flesh_boots caps at 1
        const owned: PurchaseState = { gold: 5000, owned: { item_pudge_flesh_boots: 1 } };
        expect(purchase(owned, "item_pudge_flesh_boots")).toMatchObject({
            ok: false,
            reason: "stack_limit",
        });
    });

    it("allows stacking up to the cap", () => {
        let state: PurchaseState = { gold: 5000, owned: {} };
        // hook_chain caps at 3
        for (let i = 1; i <= 3; i++) {
            const r = purchase(state, "item_pudge_hook_chain");
            expect(r.ok).toBe(true);
            expect(r.state.owned["item_pudge_hook_chain"]).toBe(i);
            state = r.state;
        }
        expect(purchase(state, "item_pudge_hook_chain").reason).toBe("stack_limit");
    });
});
