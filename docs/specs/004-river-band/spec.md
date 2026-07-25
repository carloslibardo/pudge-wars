# Spec 004 — River band

## What the player experiences

A band of river runs down the middle of the map between the two sides. Standing
in it is a gamble and a reward: while a Pudge is in the river he gets a burst of
move speed and heals faster — good for repositioning a hook or diving, but it
puts him in range of both teams' hooks. Step out and the buff fades within a
tick.

## Numbers

| Value | Number | Source |
|---|---|---|
| River axis | X | DESIGN-FRESH (teams split on X, river is the vertical mid-band) |
| River band min X | -400 | DESIGN-FRESH |
| River band max X | +400 | DESIGN-FRESH |
| River move speed bonus | 12 % | DESIGN-FRESH |
| River HP regen bonus | 30 hp/s | DESIGN-FRESH |
| River scan interval | 0.25 s | DESIGN-FRESH |

## Out of scope

- Map geometry / an actual water texture — the band is a coordinate check in
  script, configurable via the constants above, NOT `.vmap` content.
- Runes / periodic pickups in the river — v1 is a passive buff-while-inside.

## Acceptance

- [x] Marker contract written before implementation
- [x] Pure logic unit-tested: `isInRiver` (inclusive bounds, both axes),
      `riverRegenThisTick`
- [ ] e2e: `[RIVER] buff applied` when a hero enters, removed on exit (GPU host)
- [ ] Frame: river buff particle on an in-band hero (GPU host)
- [x] Engine surprises recorded in `CLAUDE.md`
