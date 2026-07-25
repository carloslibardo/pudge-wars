# Plan 003 — Rot + Flesh Heap

## Global Constraints (from CLAUDE.md)

- Both abilities + their modifiers registered five times and imported from
  `GameMode.ts` (variants after bases). Rot particle precached.
- Toggle modifier: `IsHidden`/`IsPurgable`/`RemoveOnDeath` declared explicitly;
  `DeclareFunctions` minimal.
- Rot's interval think is server-gated (`IsServer()`) and allocation-free;
  interval >= 0.1 s. `FindUnitsInRadius` once per tick, not per enemy.
- Rot self-damage clamps to leave >= 1 HP (`rotSelfDamage`, pure) — a raw
  self-damage that can exceed current HP would suicide Pudge.
- Flesh Heap bonus math is pure (`fleshHeapBonus`); the modifier only applies
  the numbers. Stacks incremented from `GameMode.onEntityKilled` when the
  attacker is a Pudge (kill event is already handled there for scoring).
- Balance numbers via `GetSpecialValueFor`.

## Marker contract

`contracts/log-markers.md`: `[ROT] tick` (enemies hit + self clamp),
`[FLESH] stack <n>`. Forbids Pudge dying to his own Rot (`[ROT] self-kill`
must never appear).

## Work order

1. `lib/combat.ts` (+ test) — `rotSelfDamage`, `fleshHeapBonus`.
2. KV: `pudge_rot` (toggle), `pudge_flesh_heap` (passive) in
   `npc_abilities_custom.txt`.
3. `abilities/pudge_rot.ts` + `modifiers/modifier_pudge_rot.ts`.
4. `abilities/pudge_flesh_heap.ts` + `modifiers/modifier_pudge_flesh_heap.ts`.
5. `GameMode.ts` — imports, precache Rot particle, Flesh Heap stack on kill.
6. `addon_english.txt` — tokens for both.

## Test plan

- Unit: `combat.test.ts` — self-damage never drops below 1 HP; flesh bonus
  scales linearly and the resist caps.
- e2e: `[ROT] tick`, `[FLESH] stack` (GPU host).
- Frames: Rot cloud on a toggled Pudge.
