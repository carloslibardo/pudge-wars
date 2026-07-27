# 007 bot motion + liveness — plan

## Order of work

1. `lib/botFormation.ts` (pure, + vitest): `anchorY(slotInTeam, perTeam,
   spacing)` (delegates to `battleLinePosition` Y), `holdY(anchor, targetY,
   clamp, tick)` = anchor + clamped tracking + square-wave strafe.
2. `lib/motionLiveness.ts` (pure, + vitest): accumulate per-bot travel from
   position samples; `isStuck(travel, threshold)`.
3. `lib/markers.ts`: `motionAudit` / `motionStuck` / `shopAudit` (+ pin test).
4. `systems/e2eHarness.ts` executor: replace mirror-nearest-Y hold with
   per-slot formation hold; sample positions each think; every 60 thinks
   (30 s) print the motion audit + shop inventory audit; gift-hunt branch
   (spec 006 step 8).
5. `scripts/vm-smoke.ps1`: new hard gates (see 006/007 contracts).

## Global constraints (from CLAUDE.md invariants)

- Pure logic in `lib/` — no `Vector`, no `GameRules`; think tick index is the
  time source passed in as a number.
- Executor orders remain `ExecuteOrderFromTable` MOVE_TO_POSITION — the
  side-lock filter (spec 004) clamps them; formation X must sit on the bank
  hold line so the filter never fights the order.
- Harness-only: all of it behind `e2eEnabled()`.
