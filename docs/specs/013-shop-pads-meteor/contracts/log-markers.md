# Marker contract — 013 shop pads + meteor

e2e only.

## Required

| Marker | Meaning |
|---|---|
| `[SHOP] trip start bot <pid> gold <g>` | bot decided to walk home and buy |
| `[SHOP] trip arrive bot <pid>` | bot entered pad radius |
| `[SHOP] purchased <item> by <pid>` | existing marker — now fires only on-pad for bots |
| `[METEOR] cast by <pid>` | meteor item activated at a point |
| `[METEOR] impact victims <n>` | impact resolved, n heroes damaged/stunned |
| `[SHOP] pads drawn 2` | pad visuals created at the horn (clients connected — FX drawn at Activate render for nobody) |

Gates (vm-smoke):
- `[SHOP] trip arrive` ≥ 6
- `[SHOP] purchased` ≥ 8 (existing shop gate stays)
- `[METEOR] cast` ≥ 2 and at least one `impact victims [1-9]`
- final `[SHOP] audit n/n` (all bots hold items) — unchanged

## Must NOT appear

- `[SHOP] purchased` by a BOT with no `trip arrive` in the prior 30 s
- Script errors mentioning `item_pudge_meteor` / `shopPads`
