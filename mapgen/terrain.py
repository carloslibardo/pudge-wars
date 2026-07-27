"""Paint the traditional Pudge Wars arena into a Dota tile grid.

Pure logic over plain sequences (no datamodel import) so it unit-tests on any
machine. Geometry comes exclusively from arena.json — the same numbers
`src/vscripts/config.ts` plays by — keeping visuals aligned with the gameplay
layer by construction.

The layout is the classic one: a flat rectangular court split down the middle
by a RIVER strip of real water (verticesWater), one field per team, and a
raised rim wall around the whole court (any tile-grid level change blocks
Dota pathing, so the rim is also the arena's collision fence). The river is
visually water but mechanically walkable at the tile level — the uncrossable
rule is enforced in script (`lib/sideLock.ts`), the same division of labor as
the buff band in spec 004.
"""

RIM_LEVEL = 3
COURT_LEVEL = 0


def paint_terrain(heights, water, arena, origin, cell_size, grid_w, grid_h):
    """Mutate the tile grid's per-vertex height/water arrays in place.

    heights/water have (grid_w+1)*(grid_h+1) entries, vertex (i, j) sits at
    world (origin.x + i*cell, origin.y + j*cell). Returns paint counts for
    logging/assertions.
    """
    hw = float(arena["play"]["halfWidth"])
    hh = float(arena["play"]["halfHeight"])
    rim = float(arena["rim"]["width"])
    river = float(arena["river"]["halfWidth"])

    vw = grid_w + 1
    court = rim_count = water_count = 0
    for j in range(grid_h + 1):
        for i in range(vw):
            x = origin[0] + i * cell_size
            y = origin[1] + j * cell_size
            idx = j * vw + i
            inside = abs(x) <= hw and abs(y) <= hh
            in_rim = (not inside) and abs(x) <= hw + rim and abs(y) <= hh + rim
            if in_rim:
                heights[idx] = RIM_LEVEL
                water[idx] = False
                rim_count += 1
            elif inside:
                heights[idx] = COURT_LEVEL
                water[idx] = abs(x) <= river
                if water[idx]:
                    water_count += 1
                court += 1
            # beyond the rim: leave the seed's scenery untouched
    return {"court": court, "rim": rim_count, "water": water_count}
