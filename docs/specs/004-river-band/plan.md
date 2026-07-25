# Plan 004 — River band

## Global Constraints (from CLAUDE.md)

- Membership is pure (`lib/river.ts`, zero engine globals) and tested; the
  engine system is a thin scanner.
- Scan think server-gated, allocation-free, interval >= 0.1 s. One
  `FindUnitsInRadius`/hero-list pass per tick.
- `modifier_pudge_river` registered + imported; its particle precached
  (invisible otherwise). `IsPurgable`/`RemoveOnDeath` declared.
- Add/remove idempotently: never stack two river modifiers (double regen); check
  `HasModifier` before adding, remove when `isInRiver` goes false.

## Marker contract

`contracts/log-markers.md`: `[RIVER] buff applied to <ent>`,
`[RIVER] buff removed from <ent>`.

## Work order

1. `lib/river.ts` (+ test) — `RiverBand` type, `isInRiver`, `riverRegenThisTick`.
2. `src/vscripts/config.ts` — the river band constants (one source of truth,
   shared by the system and any future UI).
3. `systems/riverBand.ts` — scan heroes, add/remove `modifier_pudge_river`.
4. `modifiers/modifier_pudge_river.ts` — move speed + HP regen, particle.
5. `GameMode.ts` — construct the system, import modifier, precache particle.
6. `addon_english.txt` — river modifier token (optional, for buff icon).

## Test plan

- Unit: `river.test.ts` — inside/outside/on-boundary for the X band, a Y-band
  case to prove axis switching, regen-per-tick math.
- e2e: applied on entry, removed on exit (GPU host).
- Frames: buff particle on an in-river hero.
