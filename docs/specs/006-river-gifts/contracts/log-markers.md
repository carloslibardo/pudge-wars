# 006 river gifts — log-marker contract

Written before implementation (SDD gate 3). All markers built by
`lib/markers.ts`, printed only when `e2eEnabled()`.

## Required markers

| Marker (verbatim shape) | Emitted when |
|---|---|
| `[GIFT] spawned at y <y>` | a chest is created mid-river |
| `[GIFT] hooked by <pid>` | a hook projectile latches a chest |
| `[GIFT] redeemed <kind> by <pid>` | drag completes; `<kind>` ∈ `gold\|heal\|item` |

A full smoke run (≥2 spawn intervals of match time) must print at least one
`spawned` AND at least one `redeemed`. A run with spawns but zero redeems means
the bots never hunt the chest — that is a FAIL, not a partial pass.

## Forbidden patterns

- The global set (`docs/specs/MARKERS.md`): script errors, invalid unit, etc.
- `Cannot create an entity because entity class is NULL` — gift unit KV missing
  `BaseClass` (the exact failure `npc_units_custom.txt` warns about).
- `[GIFT] spawned` appearing more than once per 20 s of log time — the
  max-1-alive gate broke.

## Frame windows

- Chest visible: any frame between a `[GIFT] spawned` and its `redeemed` —
  a chest model with a glow must sit in the water at map center. An error
  mesh (red ERROR) or nothing at all fails the visual gate.
- Collection: the ~2 s after `[GIFT] hooked` — the chest must be seen sliding
  across the water toward a bank.
