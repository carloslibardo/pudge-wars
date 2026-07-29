# Decision: Which river anti-rest mechanism makes mid-river loitering impossible and the match dynamic?

> Date: 2026-07-29 · Slug: 2026-07-29-river-hazard · Scope: dynamic-gameplay cycle (specs 011–014, field report 2026-07-29)

Context: field report "some time pudges still got stucked on the middle of river"
despite spec-008 egress + stranded sweep. River currently BUFFS occupants
(+12% speed, +30 HP/s regen) — an incentive to rest in the one place resting is
forbidden. Movement architecture (formation+noise vs utility roam) was NOT
matrixed: the user rejected formation+noise as "robotic" — that decision is
made by the field report itself.

## Options
- A: Status quo hardened — keep buff, tighten sweep grace 10s→5s
- B: Neutral river — delete buff, keep egress/sweep as-is
- C: Hazard river — regen → escalating damage after grace, visible burn FX, keep +12% speed

## Dimensions (weights justified)
- Stuck-elimination certainty ×3 — the reported bug; must hold even when bot logic regresses
- Watchability/dynamism ×2 — publishable video is the cycle's deliverable
- Classic Pudge Wars fidelity ×2 — river = danger corridor in the design record
- Implementation risk / blast radius ×2 — sideLock sweep, drag modifier, e2e gates are tuned and green
- Fairness to dragged victims walking home ×1 — legitimate river crossers
- Reversibility ×1 — all options revert by SHA/config

## Scoring Table

| Dimension (weight) | A: harden | B: neutral | C: hazard |
|---|---|---|---|
| Stuck-elimination (×3) | 3 → 9 | 2 → 6 | 4 → 12 |
| Watchability (×2) | 2 → 4 | 2 → 4 | 4 → 8 |
| Classic fidelity (×2) | 2 → 4 | 3 → 6 | 3 → 6 |
| Impl. risk (×2) | 3 → 6 | 4 → 8 | 3 → 6 |
| Victim fairness (×1) | 4 → 4 | 3 → 3 | 2 → 2 |
| Reversibility (×1) | 5 → 5 | 5 → 5 | 4 → 4 |
| **Total** | **32** | **32** | **38** |

## Evidence (analyst highlights)
### A
- Sweep already band-covers (`systems/sideLock.ts:75`); tightening treats a symptom — regen incentive survives; grace constant is DUAL-PURPOSE: raised to 10s for the run-13 kill window; naive tighten regresses kill pace.
- Buff wears a haste-rune glow — advertises the river as a reward zone on camera.
### B
- Deletion-only, no smoke gate depends on the buff (`vm-smoke.ps1` [RIVER] gates are audit-based); but adds no repellent — the reported failure can recur unchanged.
- Pre-existing three-way grace drift: audit 8s (`e2eHarness.ts:289-293`) vs sweep 10s (`sideLock.ts:24`) vs spec-008 text 8s.
### C
- Inverts the incentive AND adds redundancy under bot-logic bugs; FX plumbing exists (`modifier_pudge_river.ts:42-49` follow-particle + 0.25s scan).
- Grace as dispatched (2.5s) < honest crossing (~2.55s at 313.6 speed over 800 units) — MUST be ≥4s.
- Hazard deaths would suicide the kill feed (`GameMode.ts:146-150` scores nothing same-team) → non-lethal clamp pattern exists (`lib/combat.ts:14`).
- Motion-controlled exemption must PAUSE the clock, never reset (run-17 permanent-brawl lesson, `sideLock.ts:76-80`).
- e2e camera tripod at (0,0) needs FX carve-out, not just damage immunity.

## Recommendation
**C — hazard river**, driven by stuck-elimination (×3) and watchability (×2):
it is the only option that removes the resting INCENTIVE and adds a repellent
that keeps working when bot logic regresses, and the only one that ADDS visual
urgency for the video. A and B tied at 32; both leave the field-reported
failure mode structurally possible. C ships with the analyst amendments:
grace 4s, escalate 30→80 HP/s, non-lethal clamp (1 HP floor; sweep + swarm
finish), clock pauses under motion control, tripod exempt, regen deleted,
+12% speed kept.

## Next Steps
- [ ] Spec 012 rev of 004: `docs/specs/012-dynamic-movement/` includes river hazard numbers
- [ ] `src/config.ts`: RIVER_HP_REGEN → delete; add RIVER_HAZARD_* block
- [ ] `modifier_pudge_river.ts`: regen → hazard tick + burn FX (VPK-verify path)
- [ ] `systems/riverBand.ts`: per-hero presence clock (pause under motion control)
- [ ] Split `STRANDED_GRACE` (10s wrong-side kill window) from river-band grace (6s)
- [ ] e2e gates: no bot death by river hazard allowed ([HAZARD] tick markers, no lethal)

## Backout
Config-block revert (`RIVER_HAZARD_*` zeroed restores neutral river; restoring
RIVER_HP_REGEN restores status quo) or single-SHA revert. Detection signal:
smoke red on kill-pace gates or `[HAZARD]` lethal marker.

## Open Questions
- Escalation curve final numbers (30 flat + 10/s ramp, cap 80) — DESIGN-FRESH, tune on smoke evidence.
- Human long-hook CAST_POSITION walk-in (bots range-gated, humans not) — 4s grace assumed sufficient; playtest item.
