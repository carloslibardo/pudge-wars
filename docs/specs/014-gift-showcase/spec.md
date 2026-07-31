# Spec 014 — River gift showcase (visibility rev of 006)

## What the player experiences

A river chest spawn is an **event you cannot miss**: a light beacon column
shoots up from the water, a global chime plays, and the oversized glowing
chest **sits on the river visibly for several seconds** before anyone is
allowed to snipe it — long enough that a viewer watching the video sees "item
on the river" and pudges repositioning to hook it. (2026-07-29 field report:
"I didn't see any item respawned on the river" — run 23 spawned 29 chests but
hunters hooked most within ~1 s of spawn; the chest barely existed on screen.)

## Numbers

| Value | Number | Source |
|---|---|---|
| Spawn interval | 25 s (unchanged) | spec 006 |
| Model scale | 1.6 × | DESIGN-FRESH — chest reads at 1280-wide video |
| Beacon FX at spawn | verified `particles/items_fx/` beacon/column (VPK adjacency check first) | spec 010 landmine rule |
| Global spawn sound | `Rune.Bounty` | already shipped for redeem; reuse at spawn |
| Hunt delay (bots) | 6 s after spawn | DESIGN-FRESH — guaranteed on-screen dwell |
| Materialize phase | unhookable < 5 s, EVERYONE | run-24 rev: a stray combat hook latched a 2 s chest; intent-gating cannot stop a projectile, so the chest refuses the latch (projectile flies on) |
| Drift speed (rev 2) | 120 u/s along the river after materialize, bouncing at ±1100 | 2026-07-30 field report: "the item on the middle should be moving" — a parked chest is the only static actor on the field. 120 keeps straight bot aim viable (hook covers ~1000 units in ~0.6 s → ~70 units of chest travel, inside hook width); hunters aim with `driftLeadY` anyway |
| Drift pause | while `modifier_pudge_hook_drag` is on the chest | the drag modifier owns the chest's position mid-drag |

## Out of scope

- Minimap ping (tools-mode recording shows no minimap overlay reliably).
- Changing gift payouts (spec 006 numbers stand).

## Acceptance

- [ ] Marker contract BEFORE implementation
- [ ] Pure dwell rule unit-tested (hunter gating by chest age)
- [ ] e2e: every `[GIFT] hooked` happens ≥ 5 s after its `[GIFT] spawned`
- [ ] Frames: chest + beacon visibly sitting mid-river in ≥ 2 separate strip
      frames
- [ ] Engine surprises → CLAUDE.md
