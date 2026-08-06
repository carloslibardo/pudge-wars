# Pudge Wars

Everyone is Pudge. Two teams of five face off across a central river on a
tight court where everyone is always in hook range. **A landed hook is a
kill**: the victim is dragged home on a visible chain and executed at your
feet. First team to 10 kills takes it.

- **Meat Hook** — a fast skillshot (2400 speed) that latches the first enemy
  it hits and drags them back to you. Landing it IS the kill.
- **Rot** — a toggle cloud that damages nearby enemies and yourself (never
  fatally) and slows them.
- **Flesh Heap** — a passive: every kill permanently grows your health and
  magic resistance.
- **The river** — grants move speed + HP regen, but linger past a grace
  period and it burns you down to 1 HP. Never a resting state.
- **River gifts** — a chest drifts along the river; hook it home to redeem
  one of five prizes: gold, a full heal, a free item, a haste burst, or a
  **shield that eats the next enemy hook** — the one save against lethal
  hooks.
- **A hook-fantasy shop** — seven items: stackable hook range / speed /
  damage, boots, regen, extra health, and a castable **Meteor** (AoE stun)
  bought on shop pads at each side of the court.
- **Skills** — Vanish (brief untargetability), Iron Gut (rot immunity
  panic button), Sprint.

## Play it

Published on the Steam Workshop:
**[Pudge Wars](https://steamcommunity.com/sharedfiles/filedetails/?id=3778117052)**
(item `3778117052`) — subscribe, then find it in Dota's Arcade.

## How it was built

A Dota 2 custom game written in TypeScript, compiled to Lua with
TypeScriptToLua. Scaffolded from [dota2-claude-playbook][playbook]; each feature
was built through the playbook's SDD loop (`docs/specs/`), and the log-marker
contract a future engine run must satisfy is `docs/specs/MARKERS.md`.

It is also the playbook's dogfood: a second game built on the same rig by an
agent following that playbook as written, specifically to find out what the
playbook was still missing. It found plenty — the engine landmines L26–L33, the
failure casebook's F18–F21, and two whole bot pathologies came out of these
42 verification runs and went back upstream. Every balance number traces to a
spec in `docs/specs/`, and every invariant in `CLAUDE.md` cost at least one red
run to learn.

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

## The map is generated, not hand-made

`mapgen/` turns `arena.json` (court size, river band, spawn rows, shop pads)
into the playable `.vmap` — terrain, water, lighting, spawns — and paints the
matching minimap overview. The compile chain (`dmxconvert` +
`resourcecompiler`) is Windows-only; `scripts/vm-buildmap.ps1` runs it
end-to-end. See `content/maps/README.md` for the seed-map story.

## Where things are

| Path | What |
|------|------|
| `src/vscripts/` | Game logic. TS -> `game/scripts/vscripts/*.lua` |
| `src/vscripts/lib/` | Pure helpers, unit-tested in `lib/__tests__/` |
| `src/vscripts/abilities/` | One TypeScript class per ability |
| `src/panorama/` | UI TS -> `content/panorama/scripts/custom_game/` |
| `game/`, `content/` | KV data, layouts, maps. Compiled output is gitignored |
| `mapgen/` | Python map generator: `arena.json` -> terrain/water/spawns + minimap overview |
| `scripts/` | install/launch/publish + the Windows VM smoke-test rig (`vm.sh`, `vm-smoke.ps1`) |
| `docs/specs/` | One directory per feature: spec + plan + marker contract |
| `.claude/skills/` | The skills an agent should reach for. Triggers in `CLAUDE.md` |

`CLAUDE.md` holds the architecture invariants — the engine failures that are
silent. Read it before writing anything, and add to it every time this engine
surprises you.
