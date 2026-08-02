#!/usr/bin/env python3
"""Minimap overview texture for pudge_wars (spec: 2026-08-02 field report —
the minimap rendered WHITE because the custom map ships no overview material;
hero dots were invisible on it).

Draws a 1024x1024 top-down schematic of the arena from arena.json — dark
void, stone rim, grass court, teal river, gold shop pads — and writes it as
an uncompressed-filter PNG (pure stdlib: zlib + struct; the VM has no PIL).

The texture covers a SQUARE world box centered on the origin, half-extent
max(halfWidth, halfHeight) + rim, because the minimap material is square.
`game/resource/overviews/pudge_wars.txt` must carry the matching pos/scale:
    pos_x = -half, pos_y = +half, scale = (2*half) / 1024
"""
import argparse
import json
import struct
import zlib
from pathlib import Path

SIZE = 1024

VOID = (10, 14, 12)
RIM = (58, 54, 48)
GRASS = (72, 110, 44)
GRASS_DARK = (62, 96, 38)
RIVER = (30, 95, 102)
PAD = (201, 162, 39)


def png_write(path: Path, pixels: bytearray, size: int) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = bytearray()
    stride = size * 3
    for row in range(size):
        raw.append(0)  # filter: none
        raw += pixels[row * stride : (row + 1) * stride]
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--arena", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    arena = json.loads(Path(args.arena).read_text())
    hw = float(arena["play"]["halfWidth"])
    hh = float(arena["play"]["halfHeight"])
    rim = float(arena["rim"]["width"])
    river = float(arena["river"]["halfWidth"])
    half = max(hw, hh) + rim  # square world box the texture covers

    # Shop pads mirror src/vscripts/config.ts SHOP_PAD_X / SHOP_PAD_RADIUS.
    pad_x, pad_r = 1300.0, 400.0

    px = bytearray(SIZE * SIZE * 3)

    def put(i: int, j: int, c: tuple) -> None:
        o = (j * SIZE + i) * 3
        px[o : o + 3] = bytes(c)

    for j in range(SIZE):
        # World y: +half at the TOP row (overview pos_y is the top edge).
        wy = half - (j + 0.5) * (2 * half / SIZE)
        for i in range(SIZE):
            wx = -half + (i + 0.5) * (2 * half / SIZE)
            ax, ay = abs(wx), abs(wy)
            if ax > hw + rim or ay > hh + rim:
                c = VOID
            elif ax > hw or ay > hh:
                c = RIM
            elif ax <= river:
                c = RIVER
            elif (wx - pad_x) ** 2 + wy**2 <= pad_r**2 or (wx + pad_x) ** 2 + wy**2 <= pad_r**2:
                c = PAD
            else:
                # Faint side shading so left/right halves read on the map.
                c = GRASS if wx < 0 else GRASS_DARK
            put(i, j, c)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    png_write(out, px, SIZE)
    print(f"overview: {out} ({SIZE}x{SIZE}, world half-extent {half})")
    print(f"overviews.txt values: pos_x {-half} pos_y {half} scale {2 * half / SIZE}")


if __name__ == "__main__":
    main()
