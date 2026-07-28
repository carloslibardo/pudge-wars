# 009 bot tactics — log-marker contract

## Required markers

| Marker | Emitted when |
|---|---|
| `[DODGE] sidestep by <pid>` | a bot reacts to an inbound enemy hook |
| `[RETREAT] bot <pid> hp <pct>` | a bot breaks off below the retreat threshold |
| `[SKILL] used <name> by <pid>` | any spec-010 active cast (shared with 010) |

A full run must print ≥1 DODGE and ≥1 RETREAT (with 72+ hooks a match and
sub-35% HP fights, zero of either means the reflex layer is dead code).

## Forbidden patterns

- Global set; `[MOTION] STUCK`; `[RIVER] audit lingerers [1-9]`.

## Frame windows

- Any `[DODGE]` timestamp ±1 s: the threatened bot displaced off the hook line.
- Two frames 15 s apart: per-bot positions varied (personas), not one rhythm.
