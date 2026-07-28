# Spec 009 — Bot tactics (ported from the archer-wars bot engine)

## What the reviewer experiences

Bots that read as *playing*, not patrolling: they pick the wounded target over
the near one, sidestep a hook they can see coming, break off and run deep when
low, sprint onto a catch, and each moves with its own rhythm instead of the
whole line strafing in lockstep.

## Ported rules (source: archer-wars `src/vscripts/bots/`, adapted to one hero
## + two banks; every port is a pure lib with vitest)

| Rule | Numbers | Source |
|---|---|---|
| Target score | `-dist/1000 + (1-hpPct)*1.2`, finisher `+0.8` at ≤25% HP, stickiness `+0.4` | archer `targetSelect.ts` weights, verbatim |
| Hook threat registry | every hook self-registers `{origin, dir, speed, range, radius, firedAt, team}` at launch — no engine API exists to enumerate projectiles | archer `arrowTracker.ts` pattern |
| Dodge geometry | closest-approach on the swept line; reject if past/short/wide/&gt;1.5 s out; step 250 perpendicular on the nearer exit side | archer `dodge.ts`, verbatim |
| Dodge fairness | 400 ms reaction delay, 75% dodge chance (medium tier), one threat (lowest time-to-impact) per think | archer `difficulty.ts` medium row |
| Retreat | below 35% HP with an enemy visible → deep-bank point (own side +700), Sprint if up | archer thresholds; destination adapted to bank geometry |
| Vanish reflex | threatened + own hook on cooldown → Vanish (spec 010) | archer fade-escape analog |
| Persona anti-lockstep | mulberry32(playerId) → strafe amplitude 90–150, period 3–6 thinks, phase offset, aggression 0.9–1.1 | archer `persona.ts`, verbatim PRNG |
| Intercept aim | first-order quadratic solve on target velocity (from per-think position deltas); discontinuity filter drops velocity &gt;700 u/s per tick (a hook/teleport, don't lead into empty ground) | archer `aim.ts` + `perception.ts` filter |
| Cast hold | never re-issue a cast order within 1 s of the last — re-ordering every tick cancels the windup forever (archer: 39 orders/s, zero projectiles) | archer `castHoldSeconds` war story |

## Out of scope

- Difficulty tiers (fixed medium-equivalent numbers this pass).
- Threat scoring in target selection; zone threats (only hooks fly here).
- Archer huntNav waypoints (two banks need no navigation).

## Acceptance

- [ ] Marker contract before implementation ([DODGE], [RETREAT] markers)
- [ ] Pure libs unit-tested: scoring, threat geometry, persona, intercept
- [ ] e2e: ≥1 `[DODGE] sidestep` and ≥1 `[RETREAT]`; hook latch rate stays ≥40%
- [ ] Frame evidence: bots at visibly different rhythms/positions (no lockstep)
