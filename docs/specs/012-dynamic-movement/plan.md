# Plan — 012 dynamic movement + hazard river

Decision record: `.shippit/decisions/2026-07-29-river-hazard.md` (option C).

Order of work:
1. `src/vscripts/config.ts` — delete RIVER_HP_REGEN, add RIVER_HAZARD_* block.
2. `lib/river.ts` — pure `riverHazardDps` curve + `riverHazardTickDamage`
   (1 HP floor) + tests.
3. `modifiers/modifier_pudge_river.ts` — regen → interval-think burn; exposure
   clock PAUSES under motion control; venomancer burn FX past grace.
4. `systems/sideLock.ts` — split RIVER_GRACE 6 s from STRANDED_GRACE 10 s
   (run-13 kill window untouched).
5. `lib/botRoam.ts` (+tests) — mood mix, waypoint bands, spacing repulsion.
6. `systems/e2eHarness.ts` — formation-hold branch → roam; hazard liveness
   PROBE (bots cannot walk into the river — the order filter clamps them — so
   one bot is teleported in for 5 s at tick 240 to prove the burn live).

## Global Constraints (CLAUDE.md)

- Order filter clamps only MOVE_TO_POSITION; CAST_POSITION walks casters
  (spec 008) — roam issues only move orders.
- Motion-control clock must PAUSE, never reset (run 17).
- Un-precached particles render nothing silently — burn FX precached +
  VPK-verified.
- e2e camera tripod is a non-fake client — carved out of the river scan.
