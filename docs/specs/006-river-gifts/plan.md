# 006 river gifts — plan

## Order of work

1. `lib/riverGift.ts` (pure, + vitest): `chooseGift(roll)` uniform 3-way,
   `giftSpawnY(roll)` → ±1400, `shouldSpawn(now, lastSpawn, interval, alive)`.
2. `lib/markers.ts`: `giftSpawned` / `giftHooked` / `giftRedeemed` (+ pin test).
3. `game/scripts/npc/npc_units_custom.txt`: `npc_pudge_river_gift` —
   `BaseClass npc_dota_creature` (REQUIRED — see file header), chest model,
   300 HP, no attack, team set at spawn to NEUTRALS.
4. `systems/riverGifts.ts`: interval timer; spawns the unit at
   `(0, giftSpawnY, ground)`, attaches the rune glow particle, tracks the one
   live chest, exposes `redeem(chest, caster)`.
5. `abilities/pudge_meat_hook.ts`: projectile targets `HERO + BASIC`; on hit,
   a chest branch (unit name check) skips damage + prints `[GIFT] hooked` and
   applies the same drag modifier.
6. `modifiers/modifier_pudge_hook_drag.ts`: on arrival, if the parent is a
   chest → `RiverGiftSystem.redeem` (gold purse / full heal / free catalog
   item + overhead alert + sound), then remove the chest.
7. `GameMode.ts`: import the system; precache chest model + glow particle.
8. e2e executor: when a chest is alive and a bot's hook is ready, the team's
   best-positioned bot (smallest |Y − chest.y|) aims its hook at the chest
   instead of an enemy.

## Global constraints (from CLAUDE.md invariants)

- New unit/ability/modifier code MUST be imported from `GameMode.ts` and
  precached — both failures silent (L3/L8).
- `npc_units_custom.txt` without `BaseClass` → entity class NULL.
- Marker prints gated behind `e2eEnabled()` at call sites.
- Pure logic in `lib/` with zero Dota globals; randomness injected as
  `() => number`.
- Compiled Lua is gitignored; VM rebuilds before running (L10).
