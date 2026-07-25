# Plan 005 — Item shop

## Global Constraints (from CLAUDE.md)

- `SetUseUniversalShopMode(true)` (already set in 001) or purchases strand in
  the stash in a fountain-less arena (L13).
- Each item exists five times: KV block, TS class (`@registerAbility`, matching
  name), entry-file import, precache (none needed — no particles), loc token.
- Item numbers via `GetSpecialValueFor`, never hardcoded.
- Hook-bonus summation is pure (`sumHookBonuses`) so the balance of "3 chains =
  +750 range" is testable without the engine.
- Shop affordability/stack logic is pure (`lib/shop.ts`) and is the SINGLE
  source of the catalog the KV validation test checks against.

## Marker contract

`contracts/log-markers.md`: `[SHOP] purchased <item> by <pid>` from an
`item_purchased` game-event listener.

## Work order

1. `lib/shop.ts` (+ test) — `SHOP_ITEMS` catalog, `canAfford`, `purchase`
   (gold debit + stack cap), and re-export used by the KV test.
2. `abilities/pudge_items.ts` — `PudgeHookItem` / `PudgeStatItem` bases + the
   six concrete item classes (one module, one import from GameMode).
3. `modifiers/modifier_pudge_hook_item.ts`, `modifier_pudge_stat_item.ts`.
4. `game/scripts/npc/npc_items_custom.txt` — six KV blocks with cost + shop flags.
5. `abilities/pudge_meat_hook.ts` — read `sumHookBonuses` over the caster's hook
   modifiers when firing.
6. `GameMode.ts` — import items, listen `item_purchased` for the marker, set
   starting gold + kill bounty.
7. `addon_english.txt` — six item name/description tokens.
8. `lib/__tests__/kvShop.test.ts` — read `npc_items_custom.txt` + loc, assert
   structure against `SHOP_ITEMS`.

## Test plan

- Unit: `shop.test.ts` (affordability, stack caps, debit), `hook.test.ts`
  (`sumHookBonuses`), `kvShop.test.ts` (KV ↔ catalog ↔ loc coverage).
- e2e: `[SHOP] purchased` (GPU host).
- Frames: n/a (stat change, no persistent visual of its own).
