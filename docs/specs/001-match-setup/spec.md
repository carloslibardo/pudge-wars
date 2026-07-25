# Spec 001 — Match setup (Pudge, two teams, river map)

## What the player experiences

Everyone is Pudge — no hero pick, the grid is skipped and every player spawns as
`npc_dota_hero_pudge`. Two teams (Radiant / Dire) line up on opposite sides of a
central river. Right-click does nothing: every kill has to come from an ability.
First team to 10 kills wins. Dead Pudges respawn after a few seconds on their
own side.

## Numbers

| Value | Number | Source |
|---|---|---|
| Kills to win (team total) | 10 | DESIGN-FRESH (classic Pudge Wars is 10-25) |
| Respawn time | 5 s | DESIGN-FRESH |
| Players per team (max) | 5 | DESIGN-FRESH |
| Spawn line distance from center (X) | 3000 | DESIGN-FRESH |
| Spawn slot spacing (Y) | 500 | DESIGN-FRESH |

## Out of scope

- The `.vmap` itself (Hammer, Windows-only) — `content/maps/README.md` still
  points at needing `pudge_wars.vmap`. Spawn placement is done in script.
- Per-player scoreboard: score is per-TEAM (win condition is a team total).

## Acceptance

- [x] Marker contract written before implementation
- [x] Pure logic unit-tested (`battleLines`, team scoring reuse)
- [ ] e2e run prints `[E2E] kill scored` and `[E2E] WIN` (needs GPU host)
- [x] Engine surprises recorded in `CLAUDE.md`
