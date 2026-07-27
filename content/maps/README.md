# Maps

`pudge_wars.vmap` is GENERATED — do not hand-edit it in Hammer, and do not
commit it (gitignored; every machine cooks its own).

The generator is `mapgen/` (headless DMX transform of a Hammer-exported seed,
carried over from the archer-wars pipeline — provenance and DMX war stories in
`mapgen/NOTES.md`). It produces the traditional Pudge Wars arena:

- a flat rectangular court (`arena.json` `play`), rim wall around it (raised
  tile level = pathing fence),
- a central RIVER strip of real water (`arena.json` `river`) splitting the
  court into the two team fields,
- two facing rows of `info_player_start_dota` spawns on `spawn.lineX`.

Build it (VM, headless): `scripts/vm-buildmap.ps1` — genmap (python, kv2
text) → dmxconvert (binary vmap into this directory) → resourcecompiler
(vpk). `scripts/vm.sh smoke` runs it automatically before every smoke.

The geometry contract with `src/vscripts/config.ts` still holds: `arena.json`
`spawn.lineX/spacing` mirror `SPAWN_LINE_X`/`SPAWN_SPACING`, `river.halfWidth`
mirrors `RIVER_BAND` (visual water slightly wider than the buff band — tile
grid quantizes to 256u cells). Change one, change the other. The uncrossable-
river rule itself is script-side (`lib/sideLock.ts`), not map collision.
