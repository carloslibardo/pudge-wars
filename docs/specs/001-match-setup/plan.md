# Plan 001 — Match setup

## Global Constraints (from CLAUDE.md)

- `SetCustomGameForceHero` MUST take a BASE name — `npc_dota_hero_pudge`, not a
  `_custom` variant, or players get a random stock hero at timeout (L2).
- Pudge must be precached in `GameMode.Precache` or `CreateHeroForPlayer` fails
  "unit ... is invalid" (L3).
- Custom teams have no Hammer spawn points; repositioning stays in script
  (`systems/spawnPositions.ts`) (L7). We use the two STOCK teams here, but they
  still have no spawns in a script-only map, so the same reposition applies.
- Fountain-less arena keeps `SetUseUniversalShopMode(true)` or purchases strand
  in the stash (L13).
- Spawn geometry is pure (`lib/battleLines.ts`, zero engine globals), tested.

## Marker contract

See `contracts/log-markers.md`. Requires `[E2E] kill scored team ...` and
`[E2E] WIN team ...`. Forbids the standard load-death patterns.

## Work order

1. `game/scripts/npc/npc_heroes_custom.txt` — override `npc_dota_hero_pudge`.
2. `herolist.txt` + `addon_english.txt` — Pudge selectable + named.
3. `lib/battleLines.ts` (+ test) — two-sided spawn geometry.
4. `systems/spawnPositions.ts` — use battle lines, key by GOODGUYS/BADGUYS.
5. `GameMode.ts` — force Pudge, two teams max 5, team scoring, precache Pudge.
6. Net table + HUD — key score by team, label Radiant/Dire.

## Test plan

- Unit: `battleLines.test.ts` — sides mirror across X, slots spread on Y.
  `score.test.ts` already covers the generic tracker (reused team-keyed).
- e2e: `[E2E] kill scored`, `[E2E] WIN` (GPU host).
- Frames: n/a for setup (covered by ability specs).
