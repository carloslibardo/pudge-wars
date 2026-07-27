# mapgen notes

## Status: E1 LANDED — real seed committed, pipeline proven on VM

`seed/seed.vmap.txt` is the real `content/maps/archer_wars.vmap` exported on
the VM: `dmxconvert -i archer_wars.vmap -o seed.vmap.txt -oe keyvalues2`
(binary dmx 9 / vmap 20 → keyvalues2 4 / vmap 40). Full round-trip proven
2026-07-05: `datamodel.py` parse → mutate → write kv2 → `dmxconvert -oe
binary` → `resourcecompiler` = **56 compiled / 0 failed** → playable vpk.
No Hammer GUI anywhere in the loop.

## Terrain schema (the real find): CDmeDotaTileGrid

Dota terrain is NOT freeform mesh — it's a tile grid. Under
`world.children[CMapDotaTileGrid]` sits an element attr `tileGridData`
(`CDmeDotaTileGrid`) with plain arrays:

| attr | size | meaning |
|------|------|---------|
| `gridWidth`/`gridHeight` | 64×64 | cells of 256u; grid spans −8192..8192, origin attr on the node |
| `verticesHeight` | int[65×65=4225] | height LEVEL per vertex (seed: all 0 = flat) |
| `verticesWater` | bool[4225] | water per vertex (seed: all false) |
| `cellConfiguration` | int[3×4096] | uniform (2,5292,−1) in seed — leave untouched |
| `cellsTileSet`/`cellsOrientation`/`cellsHidden` | 4096 | uniform 0/0/false |
| `edgesPath` | bool[8320] | path edges |
| `objects*` (8 arrays) | 66049 (257²) | decoration grid: props/plants/trees/rotation |

Terrain generation = computing `verticesHeight` + `verticesWater` from
`arena.json` radii. `terrain.py` (`paint_terrain`) does exactly this
(plateau=2, rim=3, moat water minus ramp arcs, level-1 graded landings on
each ramp so the 0→1→2 climb never exceeds one level per 256u cell —
GridNav's walkable tile-ramp slope — plus a deterministic sprinkle of
level-1 field hillocks), driven by `genmap.py --terrain`.

## Build pipeline (proven green end-to-end, 2026-07-05)

Full run, seed → terrain-painted vmap → playable vpk:

```bash
mapgen/genmap.py --seed mapgen/seed/seed.vmap.txt --out mapgen/out_terrain.vmap.txt \
  --spawns 10 --radius 3000 --terrain
```

paints `verticesHeight` (plateau level 2, rim level 3, graded ramp
landings, field hillocks) + `verticesWater` (moat minus the 5 dry ramps)
from `mapgen/arena.json`, and places the 10-spawn ring, in one pass. On the VM, `scripts/vm-buildmap.ps1` runs that
same genmap step, then `dmxconvert` (kv2 → binary, into
`content/maps/archer_wars.vmap`), then `resourcecompiler` →
`game/dota_addons/archer_wars/maps/archer_wars.vpk` (last verified run:
53 compiled / 0 failed, ~4.7MB).

- **Flat-map backup**: `vm-buildmap.ps1` copies the original flat
  `archer_wars.vmap` to `content/maps/archer_wars_flat_backup.vmap` the
  *first* time it runs (skipped if the backup already exists). This is a
  VM-side file only — never committed.
- **VM prereqs**: `python3` via chocolatey (`choco install python3 -y`,
  installed 2026-07-05); `dmxconvert.exe` / `resourcecompiler.exe` ship
  with Dota at `game\bin\win64` — no separate install.
- **Map-artifact convention**: compiled `.vmap`/`.vpk` stay VM-only and are
  never committed (matches the pre-existing convention — this repo never
  committed a compiled map). Mac playtesting of terrain requires either
  pulling the compiled vpk from the VM (see
  `docs/runbooks/local-mac-sync.md`) or playtesting on the VM directly.

### Balance-change workflow

Arena geometry lives in `src/vscripts/lib/arenaManifest.ts`, not
`arena.json` — the JSON is a generated export, not a hand-edited source.

1. Edit `ARENA` in `src/vscripts/lib/arenaManifest.ts`.
2. `bun run test` — boundary-pin tests force a conscious update of any
   dependent expectations.
3. `bun run export:arena` — regenerates `mapgen/arena.json`; CI's
   drift-guard requires the committed JSON to stay in sync with the TS
   source.
4. Sync the updated `mapgen/` files to the VM (see
   `docs/runbooks/local-mac-sync.md` step 1 for the repo-sync pattern).
5. Run `scripts/vm-buildmap.ps1` on the VM to repaint + recompile the map.
6. Run the `aw_smoke` scheduled task to validate the new geometry in-game.

## Historical: fixture mode (pre-E1)

`seed/fixture.vmap.txt` is the minimal hand-written kv2 vmap this lane used
before the real seed landed. Kept for fast parser tests.

## Element structure (fixture; mirrors documented Source-2 vmap conventions)

```
CMapRootElement                      (dm.root)
├── isprefab: bool
├── editorbuild / editorversion: int
└── world: CMapWorld                 (root.get("world"))
    ├── nodeID: int
    ├── referenceID: uint64
    ├── children: element_array      ← spawns are appended here
    │   └── CMapEntity
    │       ├── nodeID: int          (unique per node; generated spawns use 10000+i)
    │       ├── referenceID: uint64
    │       ├── origin / scales: vector3
    │       ├── angles: angle        (see qangle note below)
    │       └── entity_properties: EditGameClassProps
    │           └── classname: string
    └── mapUsageType: string
```

`genmap.py` mirrors exactly this CMapEntity attribute set for the generated
`info_player_start_dota` ring.

## Vendored datamodel.py — verified API notes

- Source: Artfunkel/BlenderSourceTools `io_scene_valvesource/datamodel.py`
  (MIT, license header kept). Vendored byte-exact, BOM included.
- `datamodel.QAngle` was added by our 2026-07-05 patch (kv2 type `"qangle"`,
  subclass of `Angle`) — upstream has only `Angle` (`"angle"`). Generated
  entity angles must use `QAngle` (drift item 6 below).
- kv2 parser requires `"id" "elementid" "<uuid>"` as the FIRST line inside
  every `{ }` block — attribute lines before `id` are silently dropped.
- Supported write encodings: `keyvalues2` versions 1–4 (we write 4).
- Appending an Element to a parsed `element_array` is safe: `echo()` recounts
  `_users` from the root graph at write time, so appended elements serialize
  inline.

## Round-trip drift — status after E1/E3 verification

Output is NOT byte-faithful to the seed, but every blocking drift is FIXED
(datamodel.py patched 2026-07-05; dmxconvert+resourcecompiler accept output):

1. **`qangle`** — FIXED: `QAngle(Angle)` registered as kv2 type `"qangle"`;
   entity/sun angles (e.g. env_global_light `66 330 0`) now round-trip.
   Fixture-era `"angle"` also still works.
2. **None values** — FIXED: `_make_attr_str` now emits `"name" "string" ""` /
   `"target" "element" ""`; the previous bare `"name" string` form made
   dmxconvert abort with "Expecting attribute type".
3. **`uint64` → `int`**: still drifts (referenceID re-emits as int) —
   dmxconvert accepts it; harmless.
4. **Float formatting**: `"0 0 256"` → `"0.0 0.0 256.0"` — harmless.
5. **`$prefix_element$` thumbnail**: dropped on re-emit (asset preview JPEG,
   ~4MB) — harmless, editor-only cosmetics.
6. **`qangle` for generated entities** — FIXED: Source 2's kv2 parser only
   accepts type `"qangle"` for `CMapEntity.angles`; the plain `"angle"` type
   (an element type in this schema) makes `dmxconvert` abort with
   "Expecting '{'" when it hits a generated spawn's angle line. `genmap.py`
   emits `datamodel.QAngle(...)` for every generated `info_player_start_dota`
   for this reason (see `make_spawn`).
