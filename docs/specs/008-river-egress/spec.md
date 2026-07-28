# Spec 008 — River is never a resting state (run-14 field report bug)

## What the player experiences

Nobody loiters in the water. The river is a place hooks, chests and dragged
victims CROSS — a Pudge may wade through it, but any Pudge that stops there
gets moving again on its own (bots) or is washed back to its bank (anyone,
after a grace). The reviewer's screenshot of run 14 — several Pudges parked
idle mid-river — can never happen again.

## Root cause (from run-14 evidence)

The side-lock order filter clamps only `MOVE_TO_POSITION`. `CAST_POSITION`
passes through unclamped — and when the target point is beyond the ability's
cast range, the ENGINE walks the caster toward the point first. Gift hunters
casting at chests up to ±1400 Y away walked straight into the water, parked
there between casts, and stayed: run 14's log ends with 18 `[RIVER] buff
applied` vs 15 `removed` — three heroes finished the match standing in the
river. CLAUDE.md landmine.

## The rules

| Rule | Number | Source |
|---|---|---|
| Executor cast gate: never issue CAST_POSITION beyond | 0.95 × hook range (incl. item bonus) | DESIGN-FRESH |
| Out-of-range hunter instead repositions along its own bank to the chest's Y | — | DESIGN-FRESH |
| Executor egress: bot in river band, not hook-dragged → immediate move to own bank | every think | DESIGN-FRESH |
| Sweep: ANY hero (human too) continuously in the river band beyond grace → teleported to own bank | 8 s (same stranded grace) | DESIGN-FRESH |
| Liveness audit: `[RIVER] audit lingerers n` per window; n>0 forbidden | 30 s window | spec 007 pattern |

## Out of scope

- Making the water physically unwalkable (drag paths must cross it).
- Punishing brief crossings (a walk home takes ~3 s; grace is 8 s).

## Acceptance

- [ ] Marker contract in `contracts/log-markers.md` before implementation
- [ ] Pure logic unit-tested (cast gate, linger accounting)
- [ ] e2e: ≥2 `[RIVER] audit lingerers 0` lines, zero `lingerers [1-9]`
- [ ] Frame evidence: no idle Pudge in the water in any strip frame
