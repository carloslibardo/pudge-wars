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

/** The catalog rotated so seat N starts at item N % catalog size. Seats with
 *  `seatIndex % 4 === 1` are DESIGNATED METEOR BUYERS (spec 013): the active
 *  goes first in their preference, and `nextPurchase`'s save rule makes them
 *  hoard gold for it instead of nickel-and-diming the rotation. */
export function shoppingPreference(seatIndex: number): readonly ShopItem[] {
    const n = SHOP_ITEMS.length;
    const start = ((seatIndex % n) + n) % n;
    const rotated = [...SHOP_ITEMS.slice(start), ...SHOP_ITEMS.slice(0, start)];
    if (seatIndex % 4 === 1) {
        const active = rotated.find(i => i.kind === "active");
        if (active) return [active, ...rotated.filter(i => i !== active)];
    }
    return rotated;
}

export interface PurchasePick {
    readonly item: ShopItem;
    /** State after the buy (gold debited, count incremented). */
    readonly state: PurchaseState;
}

/** First affordable, under-cap item in this seat's preference order — with one
 *  twist (spec 013): when the next uncapped preference is the ACTIVE and only
 *  gold is missing, the bot SAVES (buys nothing) instead of skipping past it.
 *  Without this rule no bot ever accumulates the meteor's price. */
export function nextPurchase(state: PurchaseState, seatIndex: number): PurchasePick | undefined {
    for (const item of shoppingPreference(seatIndex)) {
        const result = purchase(state, item.name);
        if (result.ok) return { item, state: result.state };
        // purchase() reports gold before caps, so exclude an already-capped
        // active — otherwise a meteor OWNER would save forever.
        if (
            item.kind === "active" &&
            result.reason === "insufficient_gold" &&
            (state.owned[item.name] ?? 0) < item.maxStacks
        ) {
            return undefined;
        }
    }
    return undefined;
}
