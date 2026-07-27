import { describe, expect, it } from "vitest";
import { anchorY, holdY, strafeOffset, STRAFE_AMPLITUDE, STRAFE_PERIOD, TRACK_CLAMP } from "../botFormation";

describe("anchorY", () => {
    it("spreads 5 bots over the spawn slots, centered on 0", () => {
        const ys = [0, 1, 2, 3, 4].map(s => anchorY(s, 5, 500));
        expect(ys).toEqual([-1000, -500, 0, 500, 1000]);
    });
});

describe("strafeOffset", () => {
    it("square-waves: half the period up, half down", () => {
        const offsets = [0, 1, 2, 3, 4, 5].map(t => strafeOffset(t, STRAFE_AMPLITUDE, STRAFE_PERIOD));
        expect(offsets).toEqual([120, 120, -120, -120, 120, 120]);
    });
});

describe("holdY", () => {
    it("tracks a nearby target's Y within the clamp", () => {
        // anchor 500, target at 600 → track the full 100
        expect(holdY(500, 600, 0)).toBe(600 + STRAFE_AMPLITUDE);
    });

    it("clamps tracking so a far target cannot collapse the formation", () => {
        // anchor -1000, target at +1000: run 12's mirror rule would go to +1000;
        // formation caps the pull at TRACK_CLAMP.
        expect(holdY(-1000, 1000, 0)).toBe(-1000 + TRACK_CLAMP + STRAFE_AMPLITUDE);
    });

    it("moves between consecutive strafe half-periods — never a fixed point", () => {
        const a = holdY(0, 0, 1);
        const b = holdY(0, 0, 3);
        expect(Math.abs(a - b)).toBe(2 * STRAFE_AMPLITUDE);
    });
});
