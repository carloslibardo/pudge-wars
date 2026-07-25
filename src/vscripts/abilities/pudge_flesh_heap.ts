import { BaseAbility, registerAbility } from "../lib/dota_ts_adapter";

/**
 * Flesh Heap — a passive that grows Pudge with every kill. The whole ability is
 * its intrinsic modifier; the stack count is driven by `GameMode.onEntityKilled`
 * (which already handles the kill event for scoring), and the modifier turns
 * stacks into bonus HP + magic resistance via `lib/combat.fleshHeapBonus`.
 */
@registerAbility()
export class pudge_flesh_heap extends BaseAbility {
    GetIntrinsicModifierName(): string {
        return "modifier_pudge_flesh_heap";
    }
}
