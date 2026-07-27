/**
 * Two-sided spawn geometry for Pudge Wars — pure numbers, zero engine globals.
 *
 * The two teams line up facing each other across the river: one team on the
 * negative-X side, the other on positive X, each spread out along Y and centered
 * on the map's Y axis. This is the same purity split as `spawnRing.ts` — the
 * math is unit-tested here, and `systems/spawnPositions.ts` is the thin engine
 * shell that teleports real heroes onto these slots (custom teams have no Hammer
 * spawn points, landmine L7).
 */

/** Which side of the river a team spawns on: -1 = negative X, +1 = positive X. */
export type Side = -1 | 1;

/**
 * The spawn slot for `slot` of `slots` on the given `side`. Heroes stand on a
 * line `lineX` units from center (mirrored by side) and are spread `spacing`
 * units apart on Y, centered on Y=0.
 */
export function battleLinePosition(
    side: Side,
    slot: number,
    slots: number,
    lineX: number,
    spacing: number,
): [number, number] {
    const x = side * lineX;
    const y = (slot - (slots - 1) / 2) * spacing;
    return [x, y];
}

/**
 * Which side of the river a team fights from. Raw team numbers so this stays
 * pure and Node-testable: 2 = DOTA_TEAM_GOODGUYS (Radiant, negative X),
 * 3 = DOTA_TEAM_BADGUYS (Dire, positive X).
 */
export function sideForTeam(team: number): Side | undefined {
    if (team === 2) return -1;
    if (team === 3) return 1;
    return undefined;
}
