# Marker contract — 014 gift showcase

e2e only.

## Required

| Marker | Meaning |
|---|---|
| `[GIFT] spawned y <y>` | existing (spec 006) |
| `[GIFT] dwell ok age <s>` | printed at first bot hook attempt, s ≥ 6 |
| `[GIFT] hooked by <pid>` / `[GIFT] redeemed <kind> <pid>` | existing |

Gates (vm-smoke):
- ≥ 5 `[GIFT] spawned`, ≥ 3 `[GIFT] redeemed` (unchanged intent)
- ≥ 3 `[GIFT] dwell ok` and NO `dwell violation`

## Must NOT appear

- `[GIFT] dwell violation` (a bot hooked a chest younger than 5 s)
- Script errors mentioning gift beacon particle
