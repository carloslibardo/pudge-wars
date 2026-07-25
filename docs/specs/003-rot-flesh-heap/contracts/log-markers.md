# Log markers — 003 Rot + Flesh Heap

## Required
- `[ROT] tick self <clampedSelfDmg> hit <enemyCount>` — one Rot pulse resolved.
- `[FLESH] stack <n> on <heroEnt>` — a Flesh Heap stack added after a kill.

## Forbidden
- `[ROT] self-kill` — Rot reduced Pudge to 0 HP. The clamp exists precisely so
  this can never print; if it does, `rotSelfDamage` was bypassed.
- `attempt to index` in the Rot think — stale caster handle.

## Benign
- `[ROT] tick ... hit 0` — Rot on with no enemy nearby.
