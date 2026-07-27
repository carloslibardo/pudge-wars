/**
 * The traditional Pudge Wars rule: the river is UNCROSSABLE on foot. Each
 * team fights from its own field and reaches the enemy only through hooks —
 * a dragged victim crosses, a walker never does. (The original Warcraft 3
 * map enforced this with unwalkable water; this arena enforces it in script
 * so it holds on any map, including the stock one.)
 *
 * Pure rules here, engine shell in `systems/sideLock.ts`.
 */
import type { Side } from "./battleLines";

/**
 * Clamp a move-order X so a hero can never walk past its own river bank.
 * A hero already on the wrong side (dragged there by a hook) is allowed to
 * path back — the clamp only ever pulls the target TOWARD its own field.
 */
export function clampMoveX(side: Side, targetX: number, riverHalfWidth: number, margin: number): number {
    const bank = side * (riverHalfWidth + margin);
    return side === -1 ? Math.min(targetX, bank) : Math.max(targetX, bank);
}

/** Standing past the river on the enemy's field? */
export function onWrongSide(side: Side, x: number, riverHalfWidth: number): boolean {
    return side === -1 ? x > riverHalfWidth : x < -riverHalfWidth;
}
