# Pudge Wars

Everyone is Pudge. Two teams face off across a central river; you win by hooking
enemies to your side and finishing them. First team to 10 kills takes it.

- **Meat Hook** — a skillshot that latches the first enemy it hits and drags
  them back to you.
- **Rot** — a toggle cloud that damages nearby enemies and yourself (never
  fatally) and slows them.
- **Flesh Heap** — a passive: every kill permanently grows your health and
  magic resistance.
- **The river** — a mid-map band that grants move speed + HP regen while you
  stand in it. A coordinate band in script, not map geometry.
- **A hook-fantasy shop** — six items: longer / faster / meaner hook, boots,
  regen, and extra health.

A Dota 2 custom game written in TypeScript, compiled to Lua with
TypeScriptToLua. Scaffolded from [dota2-claude-playbook][playbook]; each feature
was built through the playbook's SDD loop (`docs/specs/`), and the log-marker
contract a future engine run must satisfy is `docs/specs/MARKERS.md`.

[playbook]: https://github.com/carloslibardo/dota2-claude-playbook

```bash
bun install     # dependencies only — never touches your Dota install
bun run build   # TypeScript -> Lua, and panorama TypeScript -> JS
bun run test    # unit tests. No Dota required, works on macOS and Linux
```

With Dota 2 installed, one more step wires the addon into it:

```bash
bun run link    # moves game/ and content/ into dota_addons/pudge_wars (symlinked back)
bun run launch  # opens Dota 2 with this addon. Workshop Tools need Windows
bun run unlink  # reverses the link
```

## The one step you cannot script

You need a `.vmap`. Maps are made in Hammer, which is Windows-only and has no
command-line "new map" path. See `content/maps/README.md`.

## Where things are

| Path | What |
|------|------|
| `src/vscripts/` | Game logic. TS -> `game/scripts/vscripts/*.lua` |
| `src/vscripts/lib/` | Pure helpers, unit-tested in `lib/__tests__/` |
| `src/vscripts/abilities/` | One TypeScript class per ability |
| `src/panorama/` | UI TS -> `content/panorama/scripts/custom_game/` |
| `game/`, `content/` | KV data, layouts, maps. Compiled output is gitignored |
| `docs/specs/` | One directory per feature: spec + plan + marker contract |
| `.claude/skills/` | The skills an agent should reach for. Triggers in `CLAUDE.md` |

`CLAUDE.md` holds the architecture invariants — the engine failures that are
silent. Read it before writing anything, and add to it every time this engine
surprises you.
