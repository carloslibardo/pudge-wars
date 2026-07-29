/**
 * The Pudge Wars item catalog and its purchase rules — pure, zero engine
 * globals, and the SINGLE source of truth for both the game and the tests.
 *
 * The native Dota shop handles the live gold/purchase transaction in-engine
 * (universal shop mode, spec 001). This module encodes the DESIGN rules —
 * costs, stack caps, which items feed the hook vs. plain stats — so they can be
 * unit-tested, and so `kvShop.test.ts` can assert the KV files and localization
 * actually match this catalog. If a KV cost drifts from the number here, that
 * test fails; nobody discovers it from a wrong tooltip weeks later.
 */

export type ItemKind = "hook" | "stat" | "active";

export interface ShopItem {
    /** KV block key == `@registerAbility` class name == loc token suffix. */
    readonly name: string;
    readonly cost: number;
    /** How many copies one Pudge may own (a design cap; see spec 005). */
    readonly maxStacks: number;
    readonly kind: ItemKind;
}

export const SHOP_ITEMS: readonly ShopItem[] = [
    { name: "item_pudge_hook_chain", cost: 600, maxStacks: 3, kind: "hook" },
    { name: "item_pudge_greased_hook", cost: 500, maxStacks: 3, kind: "hook" },
    { name: "item_pudge_barbed_hook", cost: 700, maxStacks: 4, kind: "hook" },
    { name: "item_pudge_flesh_boots", cost: 500, maxStacks: 1, kind: "stat" },
    { name: "item_pudge_rancid_flask", cost: 400, maxStacks: 2, kind: "stat" },
    { name: "item_pudge_gut_stitch", cost: 900, maxStacks: 2, kind: "stat" },
    // Spec 013: the top-shelf ACTIVE — point-target meteor, AoE damage + stun.
    { name: "item_pudge_meteor", cost: 1200, maxStacks: 1, kind: "active" },
] as const;

export function findItem(name: string): ShopItem | undefined {
    return SHOP_ITEMS.find(i => i.name === name);
}

export function canAfford(gold: number, item: ShopItem): boolean {
    return gold >= item.cost;
}

export interface PurchaseState {
    readonly gold: number;
    /** Item name -> count owned. */
    readonly owned: Readonly<Record<string, number>>;
}

export type PurchaseReason = "unknown_item" | "insufficient_gold" | "stack_limit";

export interface PurchaseResult {
    readonly ok: boolean;
    readonly state: PurchaseState;
    readonly reason?: PurchaseReason;
}

/**
 * Attempt a purchase. Returns a NEW state on success (gold debited, count
 * incremented) or the original state plus a typed reason on failure. Pure: no
 * mutation of the input.
 */
export function purchase(state: PurchaseState, itemName: string): PurchaseResult {
    const item = findItem(itemName);
    if (!item) return { ok: false, state, reason: "unknown_item" };
    if (!canAfford(state.gold, item)) return { ok: false, state, reason: "insufficient_gold" };
    const current = state.owned[itemName] ?? 0;
    if (current >= item.maxStacks) return { ok: false, state, reason: "stack_limit" };
    return {
        ok: true,
        state: {
            gold: state.gold - item.cost,
            owned: { ...state.owned, [itemName]: current + 1 },
        },
    };
}
