"""Unit tests for the tile-grid painter — pure python, runs on the Mac."""
import json
import os

import terrain

ARENA = json.load(open(os.path.join(os.path.dirname(__file__), "arena.json")))
GW = GH = 64
CELL = 16384.0 / GW
ORIGIN = (-8192.0, -8192.0)


def paint():
    n = (GW + 1) * (GH + 1)
    heights = [7] * n  # sentinel: anything the painter must overwrite
    water = [False] * n
    counts = terrain.paint_terrain(heights, water, ARENA, ORIGIN, CELL, GW, GH)
    return heights, water, counts


def vertex_index(x, y):
    i = round((x - ORIGIN[0]) / CELL)
    j = round((y - ORIGIN[1]) / CELL)
    return j * (GW + 1) + i


def test_court_is_flat_level_zero():
    heights, _, _ = paint()
    hw = ARENA["play"]["halfWidth"]
    hh = ARENA["play"]["halfHeight"]
    # Arena-relative samples: center, mid-field both sides, near both corners
    # (grid-snapped inward so the sample stays inside the play box).
    inx, iny = hw - CELL, hh - CELL
    for x, y in [(0, 0), (-hw / 2, hh / 3), (hw / 2, -hh / 3), (-inx, iny), (inx, -iny)]:
        assert heights[vertex_index(x, y)] == terrain.COURT_LEVEL, (x, y)


def test_river_is_water_only_in_the_central_band():
    _, water, counts = paint()
    assert water[vertex_index(0, 0)]
    assert water[vertex_index(-256, 1024)]
    assert water[vertex_index(256, -1024)]
    # own fields stay dry
    assert not water[vertex_index(-3000, 0)]
    assert not water[vertex_index(3000, 500)]
    assert counts["water"] > 0


def test_rim_wall_is_raised_and_dry():
    heights, water, counts = paint()
    hw = ARENA["play"]["halfWidth"]
    hh = ARENA["play"]["halfHeight"]
    # one vertex just beyond each play-box edge (within rim width 256)
    for x, y in [(hw + CELL / 2, 0), (-(hw + CELL / 2), 0), (0, hh + CELL / 2)]:
        idx = vertex_index(x, y)
        assert heights[idx] == terrain.RIM_LEVEL, (x, y)
        assert not water[idx]
    assert counts["rim"] > 0


def test_outside_the_rim_is_untouched():
    heights, _, _ = paint()
    assert heights[vertex_index(-8192, -8192)] == 7  # sentinel survives
