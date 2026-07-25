/**
 * Rot self-damage and Flesh Heap stacking — pure combat math, zero engine
 * globals. The modifiers read these and apply the numbers; the rules live here
 * where a test can pin them.
 */

/**
 * How much self-damage Rot may actually deal this tick. Rot damages Pudge as
 * well as his enemies, but it must NEVER kill him — Dota's Rot leaves the caster
 * at a minimum of 1 HP. So clamp the raw self-damage to whatever keeps him above
 * zero. At 1 HP (or below) the clamp is 0: Rot bleeds you down to a sliver and
 * then holds there.
 */
export function rotSelfDamage(currentHp: number, rawSelfDamage: number): number {
    const survivable = Math.max(0, currentHp - 1);
    return Math.min(rawSelfDamage, survivable);
}

export interface FleshHeapBonus {
    readonly bonusHp: number;
    readonly resistPct: number;
}

/**
 * The cumulative Flesh Heap bonus at `stacks` kills: flat max-HP that grows
 * linearly and forever, plus magic resistance that grows per stack but is capped
 * (`resistCap`, a fraction 0..1) so a 40-kill Pudge is not immune to magic.
 */
export function fleshHeapBonus(
    stacks: number,
    hpPerStack: number,
    resistPerStack: number,
    resistCap: number,
): FleshHeapBonus {
    const safeStacks = Math.max(0, stacks);
    return {
        bonusHp: safeStacks * hpPerStack,
        resistPct: Math.min(safeStacks * resistPerStack, resistCap),
    };
}
