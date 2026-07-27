/**
 * River gift decisions (spec 006) — pure, zero engine globals.
 *
 * A glowing chest spawns mid-river on an interval and can only be collected by
 * hooking it. WHAT spawns where, WHICH gift a chest pays out, and WHO on a team
 * should go hunt it are all decisions — so they live here, unit-tested, with
 * randomness injected as a plain `roll` in [0, 1). `systems/riverGifts.ts` is
 * the thin engine shell that creates units and grants rewards.
 */

export type GiftKind = "gold" | "heal" | "item";

export const GIFT_KINDS: readonly GiftKind[] = ["gold", "heal", "item"];

/** Uniform three-way choice. `roll` in [0, 1); out-of-range rolls clamp. */
export function chooseGift(roll: number): GiftKind {
    const r = Math.max(0, Math.min(0.999999, roll));
    return GIFT_KINDS[Math.floor(r * GIFT_KINDS.length)];
}

/** Spawn Y for a chest: uniform in [-maxY, +maxY]. `roll` in [0, 1). */
export function giftSpawnY(roll: number, maxY: number): number {
    const r = Math.max(0, Math.min(1, roll));
    return -maxY + r * 2 * maxY;
}

/**
 * The index of the bot best placed to hook the chest — smallest |y − giftY|,
 * lowest index winning ties. `undefined` on an empty roster.
 */
export function giftHunter(botYs: readonly number[], giftY: number): number | undefined {
    let best: number | undefined;
    let bestDist = 0;
    for (let i = 0; i < botYs.length; i++) {
        const d = Math.abs(botYs[i] - giftY);
        if (best === undefined || d < bestDist) {
            best = i;
            bestDist = d;
        }
    }
    return best;
}
