# Plan 002 — Meat Hook

## Global Constraints (from CLAUDE.md)

- `pudge_meat_hook` class name == KV key == `ScriptFile` path (L: five
  registrations). Imported from `GameMode.ts` for the decorator side effect.
- Hook + drag particles precached in `GameMode.Precache` — un-precached
  particles render NOTHING silently (L3/L12).
- Numbers via `GetSpecialValueFor`, never hardcoded (KV is the balance surface).
- Drag uses a horizontal motion modifier; `OnProjectileHit(target)` gets
  `undefined` at max range — handle it; guard `target.IsNull()` (target can die
  mid-flight).
- Stored victim handle re-validated every drag think (`IsNull` before use) —
  a stale handle indexed in a think kills the think silently forever (L: handle
  hygiene, /tstl-lua-gotchas).
- Drag think allocation-free; interval >= 0.1 s.
- Item hook bonuses read via `sumHookBonuses` (pure) over the caster's
  `modifier_pudge_hook_item` instances — see spec 005.

## Marker contract

`contracts/log-markers.md`: `[HOOK] fired`, `[HOOK] latched`, `[DRAG] complete`.
Forbids `attempt to index` (stale handle in drag think).

## Work order

1. `lib/markers.ts` (+ test) — shared marker strings.
2. `lib/hook.ts` (+ test) — `hookDirection`, `firstHookTarget`, `dragStep`,
   `hasArrived`, `sumHookBonuses`.
3. `game/scripts/npc/npc_abilities_custom.txt` — `pudge_meat_hook` KV.
4. `src/vscripts/abilities/pudge_meat_hook.ts` — fire + latch + start drag.
5. `src/vscripts/modifiers/modifier_pudge_hook_drag.ts` — motion modifier that
   steps the victim to the caster via `dragStep`, prints `[DRAG] complete`.
6. `GameMode.ts` — import both, precache hook particles.
7. `addon_english.txt` — hook tooltip tokens.

## Test plan

- Unit: `hook.test.ts` — direction normalization, first-target-along-ray with a
  near miss just outside the width, drag stepping and arrival threshold, bonus
  summation.
- e2e: the three hook markers in order for one cast (GPU host).
- Frames: the ~1 s after `[HOOK] fired` — chain visible, victim displaced.
