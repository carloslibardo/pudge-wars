# 007 bot motion + liveness — log-marker contract

Written before implementation (SDD gate 3).

## Required markers

| Marker (verbatim shape) | Emitted when |
|---|---|
| `[MOTION] audit bot <pid> travelled <units> in <window>s` | every liveness window, per live bot |
| `[SHOP] audit bots_with_items <n>/<m>` | every liveness window: n of m live bots hold ≥1 item |

A smoke run must print at least TWO full `[MOTION] audit` rounds (so liveness
is measured mid-match, not just at the horn) and its final `[SHOP] audit` must
read `n/n` (every living bot owns at least one item by end of match).

## Forbidden patterns

- `[MOTION] STUCK bot <pid>` — a bot travelled under the stuck threshold in a
  full window. Any single occurrence fails the run.
- The global forbidden set (`docs/specs/MARKERS.md`).

## Frame windows

- Any two strip frames ≥15 s apart during the match: each team's Pudges must be
  SPREAD (not one stack) and individual bots must be in different positions
  between the frames. Two identical-looking consecutive frames of the same
  blob is exactly the run-12 failure and rejects the run.
