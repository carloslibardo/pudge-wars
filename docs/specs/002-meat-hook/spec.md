# Spec 002 — Meat Hook

## What the player experiences

Pudge's signature. Press Q, aim at a point, and a hook chain flies in a straight
line. The FIRST enemy Pudge it touches is latched, takes damage, and is dragged
all the way back to Pudge — dropping them into your team's side, next to you and
your allies, to be finished off. Miss and nothing happens but the cooldown. The
hook has a fixed range and travel speed; both (and its damage) are increased by
shop items (spec 005).

## Numbers

| Value | Number | Source |
|---|---|---|
| Base hook damage | 100 / 150 / 200 / 250 per level | DESIGN-FRESH (Dota Pudge is 90-360) |
| Hook projectile speed | 1600 u/s | DESIGN-FRESH (Dota is 1600) |
| Hook range | 1100 u | DESIGN-FRESH (Dota is 1000-1300) |
| Hook width (radius) | 100 u | DESIGN-FRESH (Dota is ~100) |
| Drag speed | 1050 u/s | DESIGN-FRESH (Dota hook return ~1450; slower here to read) |
| Cooldown | 5 s | DESIGN-FRESH |

## Out of scope

- Hooking allies (to save them) — enemy-only for v1.
- Hooking non-hero units (there are none in this mode).
- Interrupting the drag with terrain/stuns — the drag runs to completion.

## Acceptance

- [x] Marker contract written before implementation
- [x] Pure logic unit-tested: `hookDirection`, `firstHookTarget`, `dragStep`,
      `hasArrived` (`lib/__tests__/hook.test.ts`)
- [ ] e2e prints `[HOOK] fired`, `[HOOK] latched`, `[DRAG] complete` (GPU host)
- [ ] Frame evidence: hook chain travels and victim slides back (GPU host)
- [x] Engine surprises recorded in `CLAUDE.md`
