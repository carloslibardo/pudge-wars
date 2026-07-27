#!/usr/bin/env python3
"""Pudge Wars arena generator — headless .vmap transform, no Hammer.

Reads the keyvalues2 (text) .vmap seed (a stock map skeleton exported from
Hammer once, carried over from the archer-wars pipeline), then:

  - paints the tile grid into the traditional Pudge Wars court (flat field,
    central river of real water, raised rim wall) — terrain.py
  - places two facing rows of spawn entities, one per team side
  - brightens the seed's gloomy stock lighting rig
  - pins the native minimap window with dota_minimap_boundary entities

The output kv2 text is converted to binary with dmxconvert and compiled with
resourcecompiler on the VM (scripts/vm-buildmap.ps1) — this script never
needs Dota installed. See mapgen/NOTES.md (archer-wars provenance) for the
DMX schema war stories: qangle-not-angle, nodeID bands, kv2 round-trip drift.
"""
import argparse
import json
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import datamodel  # vendored: Artfunkel/BlenderSourceTools (see file header)
import terrain


def find_world(dm):
    root = dm.root
    world = root.get("world")
    if world is None:
        raise SystemExit("seed has no root 'world' element — wrong file?")
    return world


def find_tile_data(dm):
    """DFS for the CDmeDotaTileGrid data element (key 'verticesHeight')."""
    seen = set()

    def visit(el):
        if id(el) in seen:
            return None
        seen.add(id(el))
        for k in el.keys():
            v = el[k]
            tn = type(v).__name__
            if tn == "Element":
                if "verticesHeight" in v.keys():
                    return v
                r = visit(v)
                if r is not None:
                    return r
            elif tn == "_ElementArray":
                for e in list(v):
                    r = visit(e)
                    if r is not None:
                        return r
        return None

    return visit(dm.root)


# Same brightening the archer arena needed: the seed's stock day/night rig is
# unusably gloomy in a compact arena (fog from ~1000u, fow darkness 2.7).
LIGHT_OVERRIDES = {
    "ent_dota_lightinfo": {
        "fow_darkess_day": "1.0",
        "fow_darkess_night": "1.0",
        "fow_color_day": "0.6 0.75 0.9",
        "fow_color_night": "0.6 0.75 0.9",
        "fog_start_day": "3000",
        "fog_start_night": "3000",
        "fog_end_day": "9000",
        "fog_end_night": "9000",
        "color_day": "255 240 220 0",
        "color_night": "255 240 220 0",
        "ambient_scale_day": "2.0",
        "ambient_scale_night": "2.0",
    },
    "env_fog_controller": {
        "fogstart": "3000",
        "fogend": "9000",
        "fogmaxdensity": "0.35",
        "fogcolor": "205 228 245 255",
    },
    "env_global_light": {
        "color": "255 240 220 0",
        "fow_darkness": "1.0",
    },
    "env_tonemap_controller": {
        "MinExposure": "0.5",
    },
}


def apply_light_overrides(dm):
    applied = {}
    seen = set()

    def visit(el):
        if id(el) in seen:
            return
        seen.add(id(el))
        for k in el.keys():
            v = el[k]
            tn = type(v).__name__
            if tn == "Element":
                if k == "entity_properties" and "classname" in v.keys():
                    ov = LIGHT_OVERRIDES.get(v["classname"])
                    if ov:
                        for key, val in ov.items():
                            v[key] = val
                        applied[v["classname"]] = applied.get(v["classname"], 0) + 1
                else:
                    visit(v)
            elif tn == "_ElementArray":
                for e in list(v):
                    visit(e)

    visit(dm.root)
    return applied


# Native minimap window (min/max corner point entities). Without them the
# client guesses the playable area and the minimap reads as infinite.
MINIMAP_BOUNDARY = 4800.0


def make_minimap_boundary(dm, x, y, corner):
    ent = dm.add_element(f"pw_mmbound_{corner}", "CMapEntity", id=uuid.uuid4())
    ent["nodeID"] = 40000 if corner == "min" else 40001
    ent["referenceID"] = datamodel.UInt64(0)
    ent["origin"] = datamodel.Vector3([x, y, 128.0])
    ent["angles"] = datamodel.QAngle([0, 0, 0])
    ent["scales"] = datamodel.Vector3([1, 1, 1])
    props = dm.add_element(f"pw_mmbound_props_{corner}", "EditGameClassProps", id=uuid.uuid4())
    props["classname"] = "dota_minimap_boundary"
    ent["entity_properties"] = props
    return ent


def make_spawn(dm, x, y, z, index, yaw):
    """info_player_start_dota facing `yaw`. Angles MUST be qangle — plain
    'angle' makes dmxconvert parse it as an element type and abort."""
    ent = dm.add_element(f"pw_spawn_{index}", "CMapEntity", id=uuid.uuid4())
    ent["nodeID"] = 10000 + index
    ent["referenceID"] = datamodel.UInt64(0)
    ent["origin"] = datamodel.Vector3([x, y, z])
    ent["angles"] = datamodel.QAngle([0, yaw, 0])
    ent["scales"] = datamodel.Vector3([1, 1, 1])
    props = dm.add_element(f"pw_spawn_props_{index}", "EditGameClassProps", id=uuid.uuid4())
    props["classname"] = "info_player_start_dota"
    ent["entity_properties"] = props
    return ent


def spawn_rows(arena):
    """Two facing rows, one per side: [(x, y, yaw), ...]. Radiant row on
    negative X faces +x (yaw 0); Dire row faces -x (yaw 180). Mirrors
    lib/battleLines.battleLinePosition — the runtime teleports every hero to
    those computed slots anyway (custom teams get no Hammer spawn points),
    these entities are the engine-facing fallback and Hammer ground truth."""
    line_x = float(arena["spawn"]["lineX"])
    spacing = float(arena["spawn"]["spacing"])
    per_team = int(arena["spawn"]["perTeam"])
    rows = []
    for side, yaw in ((-1, 0), (1, 180)):
        for slot in range(per_team):
            y = (slot - (per_team - 1) / 2) * spacing
            rows.append((side * line_x, y, yaw))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument(
        "--arena",
        default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "arena.json"),
    )
    args = ap.parse_args()

    with open(args.arena) as f:
        arena = json.load(f)

    dm = datamodel.load(args.seed)
    world = find_world(dm)
    children = world.get("children")
    if children is None:
        raise SystemExit("world has no children array")

    for i, (x, y, yaw) in enumerate(spawn_rows(arena)):
        children.append(make_spawn(dm, x, y, 128.0, i, yaw))

    children.append(make_minimap_boundary(dm, -MINIMAP_BOUNDARY, -MINIMAP_BOUNDARY, "min"))
    children.append(make_minimap_boundary(dm, MINIMAP_BOUNDARY, MINIMAP_BOUNDARY, "max"))

    grid_node = next(c for c in children if c.type == "CMapDotaTileGrid")
    data = find_tile_data(dm)
    gw, gh = data.get("gridWidth"), data.get("gridHeight")
    origin = grid_node["origin"]
    cell = 16384.0 / gw
    counts = terrain.paint_terrain(
        data.get("verticesHeight"), data.get("verticesWater"),
        arena, (origin[0], origin[1]), cell, gw, gh,
    )
    print(f"terrain: court_v={counts['court']} rim_v={counts['rim']} water_v={counts['water']}")

    applied = apply_light_overrides(dm)
    print(f"lighting: brightened {applied}")

    dm.write(args.out, "keyvalues2", 4)
    print(f"wrote {args.out}: {len(spawn_rows(arena))} spawns in two rows")


if __name__ == "__main__":
    main()
