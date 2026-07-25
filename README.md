# Pudge Wars

A Dota 2 custom game written in TypeScript, compiled to Lua with
TypeScriptToLua. Scaffolded from [dota2-claude-playbook][playbook].

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
