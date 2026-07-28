# 008 river egress — log-marker contract

## Required markers

| Marker | Emitted when |
|---|---|
| `[RIVER] audit lingerers <n>` | every liveness window: heroes in the band > grace |

A run must print ≥2 audits and every one must read `lingerers 0`.

## Forbidden patterns

- `[RIVER] audit lingerers [1-9]` — someone parked in the water past grace.
- Global forbidden set (docs/specs/MARKERS.md).

## Frame windows

- Every strip frame: any Pudge inside the water band must be either mid-drag
  (STUNNED), mid-walk (different position next frame), or hunting at the
  water's edge — never the same idle Pudge in the water across two frames
  15 s apart.
