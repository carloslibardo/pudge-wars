# Log markers — 005 Item shop

## Required
- `[SHOP] purchased <item_name> by <pid>` — a custom item was bought.

## Forbidden
- Purchases vanishing (no marker after a buy that debited gold) — universal shop
  mode missing, item stranded in stash (L13).
- `#DOTA_Tooltip_...` rendered literally in a tooltip — missing loc token.
- A `GetSpecialValueFor` on an item returning 0 where a bonus was expected — a
  renamed AbilityValues key (silent).

## Benign
- Native/neutral item purchases — the listener only marks `item_pudge_*`.
