import { BaseItem, registerAbility } from "../lib/dota_ts_adapter";

/**
 * The six hook-fantasy shop items (spec 005). Two shapes, one module:
 *
 *  - HOOK items (chain / greased / barbed) are pure DATA: they carry
 *    `bonus_range` / `bonus_speed` / `bonus_damage` in their KV and have no
 *    behavior of their own. Meat Hook reads them straight out of the inventory
 *    and folds them in via `lib/hook.sumHookBonuses`. So these classes are empty
 *    — they exist only so the `item_lua` KV key resolves to a class.
 *
 *  - STAT items (boots / flask / gut_stitch) grant a plain passive stat, so they
 *    share ONE intrinsic modifier (`modifier_pudge_stat_item`) that reads
 *    whichever `bonus_*` value its item defines (the others are simply absent →
 *    0). One modifier, values differ per item KV — no copy-paste.
 *
 * All six are registered by exact name; each item's KV `ScriptFile` points at
 * this module. The catalog + prices are pinned in `lib/shop.ts` and cross-checked
 * against the KV files by `kvShop.test.ts`.
 */

class PudgeHookItem extends BaseItem {
    // No intrinsic modifier: the hook reads the item's bonus_* values directly.
}

class PudgeStatItem extends BaseItem {
    GetIntrinsicModifierName(): string {
        return "modifier_pudge_stat_item";
    }
}

@registerAbility()
export class item_pudge_hook_chain extends PudgeHookItem {}

@registerAbility()
export class item_pudge_greased_hook extends PudgeHookItem {}

@registerAbility()
export class item_pudge_barbed_hook extends PudgeHookItem {}

@registerAbility()
export class item_pudge_flesh_boots extends PudgeStatItem {}

@registerAbility()
export class item_pudge_rancid_flask extends PudgeStatItem {}

@registerAbility()
export class item_pudge_gut_stitch extends PudgeStatItem {}
