# Spec 007 — Bot formation motion + liveness gate

## What the reviewer experiences

This spec's "player" is the person reviewing a smoke recording. Run 12's video
showed each team collapsed into ONE motionless blob at the river's north bend:
every bot mirrored its *nearest enemy's* Y, which is a positive-feedback loop —
whoever drifts together stays together, and after ~30 s all ten Pudges stand
still in two stacks. Markers were green; the game looked dead.

After this spec, a recording must show:

- **Formation**: each team's five Pudges spread along their own bank on
  per-slot anchors (the same slots they spawn on), covering the river's length
  instead of stacking.
- **Motion**: every bot visibly paces — a small strafe oscillation around its
  anchor plus bounded tracking toward its current target's Y — so no bot ever
  stands still for more than a couple of seconds.
- **Gift hunting**: when a river chest is up (spec 006), the best-positioned
  bot turns and hooks the chest.

And the harness must PROVE liveness in the log, so a static match can never go
green again: it samples every bot's position each think and periodically prints
a travel audit; the smoke gate fails on any stuck bot.

## Numbers

| Value | Number | Source |
|---|---|---|
| Anchor slots | spawn slots (`battleLinePosition`, spacing 500) | spec 001 geometry |
| Target tracking clamp | ±250 around anchor | DESIGN-FRESH (tracks without collapsing) |
| Strafe amplitude | ±120 | DESIGN-FRESH (visible at 15 fps, ~2 s period) |
| Strafe period | 4 thinks (2 s) | DESIGN-FRESH |
| Liveness window | 30 s | DESIGN-FRESH |
| Stuck threshold | < 300 units travelled per window | DESIGN-FRESH (strafe alone yields ~3600) |
| Swarm range | 1500 | DESIGN-FRESH (run-13 rev: whole team collapses on a caught enemy) |
| Stranded grace | 8 s (was 3) | DESIGN-FRESH (run-13 rev: grace must outlast the pack kill) |

### Run-13 revision: swarm the catch

Run 13 proved formation play alone starves kills: 198 completed drags, ZERO
kills in nine minutes. A caught victim landed at ONE bot (one Rot ≈ 24 dps),
and either the 3 s stranded sweep or a walk home through the water (the river
is uncrossable by ORDERS, not physics) freed it long before death. Fix, in
traditional Pudge Wars terms: a hooked enemy on your field is the team's kill
window — every bot within swarm range converges, re-hooks it deeper when its
hook is up, and Rot does the rest. Grace raised to 8 s so the window can
actually close.

## Out of scope

- Dodging incoming hooks, juking, human-like pathing.
- Changing hook aim/target selection against heroes (spec 002 math stands).
- Real-match bots — all of this is e2e-harness-only, inert for humans.

## Acceptance

- [ ] Marker contract written BEFORE implementation
- [ ] Pure logic unit-tested: anchor/hold position, strafe, travel accounting
- [ ] e2e: `[MOTION] audit` lines present, zero `[MOTION] STUCK`
- [ ] Frame evidence: bots spread along both banks AND displaced between
      consecutive strip frames
- [ ] Any engine surprise recorded in `CLAUDE.md` invariants
