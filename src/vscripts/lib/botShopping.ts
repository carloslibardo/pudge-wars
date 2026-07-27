/**
 * What should an e2e bot buy next?
 *
 * Decisions run through the SAME pure `purchase()` rule the design pins in
 * `lib/shop.ts` (cost, stack caps), so a bot can never buy something the
 * design forbids — and a green smoke exercises the real catalog rules.
 *
 * Each seat prefers a different rotation of the catalog so nine bots spread
 * their gold across all six items instead of all buying the same one.
 *
 * Pure — no engine globals; unit-tested on Node.
 */
import { SHOP_ITEMS, purchase, type PurchaseState, type ShopItem } from "./shop";

/** The catalog rotated so seat N starts at item N % 6. */
export function shoppingPreference(seatIndex: number): readonly ShopItem[] {
    const n = SHOP_ITEMS.length;
    const start = ((seatIndex % n) + n) % n;
    return [...SHOP_ITEMS.slice(start), ...SHOP_ITEMS.slice(0, start)];
}

export interface PurchasePick {
    readonly item: ShopItem;
    /** State after the buy (gold debited, count incremented). */
    readonly state: PurchaseState;
}

/** First affordable, under-cap item in this seat's preference order. */
export function nextPurchase(state: PurchaseState, seatIndex: number): PurchasePick | undefined {
    for (const item of shoppingPreference(seatIndex)) {
        const result = purchase(state, item.name);
        if (result.ok) return { item, state: result.state };
    }
    return undefined;
}
