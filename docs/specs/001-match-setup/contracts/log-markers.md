# Log markers — 001 Match setup

## Required
- `[E2E] harness engaged — driving bots` — harness started (from template).
- `[E2E] kill scored team <t> -> <n>` — a kill credited to a team total.
- `[E2E] WIN team <t> reached <n> kills` — win condition fired.

## Forbidden
- `unit ... is invalid` — Pudge not precached.
- Player handed a random stock hero — force-hero name did not resolve (base
  name wrong). Symptom in log: a non-`npc_dota_hero_pudge` unit name.
- `error in error handling` — load-time death.

## Benign
- `[E2E] seating fake clients during setup` — expected in tools e2e.
