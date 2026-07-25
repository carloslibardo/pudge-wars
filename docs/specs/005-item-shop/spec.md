# Spec 005 — Item shop

## What the player experiences

A small shop of hook-flavoured items, bought with gold earned from kills. Nothing
is a stat-stick for its own sake — every item feeds the hook fantasy: a longer
hook, a faster hook, a meaner hook, boots to walk your victim down, and regen to
survive your own Rot. Buy them from the native shop; they apply instantly.

## The catalog

| Item | Effect | Cost | Stacks |
|---|---|---|---|
| `item_pudge_hook_chain` | +250 hook range | 600 | up to 3 |
| `item_pudge_greased_hook` | +400 hook projectile speed | 500 | up to 3 |
| `item_pudge_barbed_hook` | +40 hook damage | 700 | up to 4 |
| `item_pudge_flesh_boots` | +45 move speed | 500 | 1 |
| `item_pudge_rancid_flask` | +12 hp/s regen | 400 | up to 2 |
| `item_pudge_gut_stitch` | +350 max HP | 900 | up to 2 |

Six items. Hook items (chain / greased / barbed) grant a hidden
`modifier_pudge_hook_item` carrying `bonus_range` / `bonus_speed` /
`bonus_damage`; Meat Hook sums them across all such modifiers via
`sumHookBonuses`. Stat items (boots / flask / gut_stitch) grant
`modifier_pudge_stat_item` reading `bonus_movespeed` / `bonus_health_regen` /
`bonus_health`.

## Numbers

All costs and effects above are DESIGN-FRESH. Starting gold and per-kill bounty
are set on the mode; a kill is worth enough to matter over a 10-kill game.

| Value | Number | Source |
|---|---|---|
| Starting gold | 600 | DESIGN-FRESH |
| Gold per kill (bonus) | 300 | DESIGN-FRESH |

## Out of scope

- Recipes / combined items — every item is a single-tier buy.
- Selling items back (native sell is left at engine default).

## Acceptance

- [x] Marker contract written before implementation
- [x] Pure logic unit-tested: `shop.ts` — affordability, stack caps, gold debit;
      `sumHookBonuses`
- [x] KV structural validation test — every shop item has a cost, an
      ItemPurchasable flag, and a matching class/loc token
- [ ] e2e: `[SHOP] purchased <item> by <pid>` (GPU host)
- [x] Engine surprises recorded in `CLAUDE.md`
