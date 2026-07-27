import { describe, expect, it } from "vitest";
import { clampMoveX, onWrongSide } from "../sideLock";

const RIVER = 400;
const MARGIN = 50;

describe("clampMoveX", () => {
    it("blocks a Radiant (-1) move into or past the river", () => {
        expect(clampMoveX(-1, 0, RIVER, MARGIN)).toBe(-450);
        expect(clampMoveX(-1, 2000, RIVER, MARGIN)).toBe(-450);
    });

    it("blocks a Dire (+1) move into or past the river", () => {
        expect(clampMoveX(1, -2000, RIVER, MARGIN)).toBe(450);
    });

    it("leaves own-field moves untouched", () => {
        expect(clampMoveX(-1, -1200, RIVER, MARGIN)).toBe(-1200);
        expect(clampMoveX(1, 800, RIVER, MARGIN)).toBe(800);
    });

    it("always pulls toward the own field, so a dragged hero can path home", () => {
        // Radiant hero stranded at x=900 ordering a move to x=600: clamped to
        // the own bank, i.e. the move goes home, never deeper.
        expect(clampMoveX(-1, 600, RIVER, MARGIN)).toBe(-450);
    });
});

describe("onWrongSide", () => {
    it("detects a hero past the river on the enemy field", () => {
        expect(onWrongSide(-1, 500, RIVER)).toBe(true);
        expect(onWrongSide(1, -500, RIVER)).toBe(true);
    });

    it("own field and the river itself are not wrong-side", () => {
        expect(onWrongSide(-1, -500, RIVER)).toBe(false);
        expect(onWrongSide(-1, 0, RIVER)).toBe(false);
        expect(onWrongSide(1, 300, RIVER)).toBe(false);
    });
});
