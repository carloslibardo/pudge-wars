# Log markers — 002 Meat Hook

## Required (in order, per successful hook)
- `[HOOK] fired by <pid> dir (<dx>,<dy>)` — projectile launched.
- `[HOOK] latched enemy <victimEnt> by <pid>` — first enemy caught.
- `[DRAG] complete victim <victimEnt> -> caster <pid>` — victim reached caster.

## Forbidden
- `attempt to index` — a stale victim/caster handle used in the drag think
  without an `IsNull` guard (the classic silent-think-death).
- A `[HOOK] latched` with no following `[DRAG] complete` within ~3 s — the
  motion modifier never resolved (victim handle lost, or arrival threshold
  never met).

## Benign
- A `[HOOK] fired` with no `latched` — a legitimate miss.
