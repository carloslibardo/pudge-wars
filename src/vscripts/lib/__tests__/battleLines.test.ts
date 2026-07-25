import { describe, expect, it } from "vitest";
import { battleLinePosition } from "../battleLines";

describe("battleLinePosition", () => {
    it("puts the two sides on mirrored X lines", () => {
        const [xLeft] = battleLinePosition(-1, 0, 5, 3000, 500);
        const [xRight] = battleLinePosition(1, 0, 5, 3000, 500);
        expect(xLeft).toBe(-3000);
        expect(xRight).toBe(3000);
    });

    it("centers the slots on Y=0", () => {
        // 5 slots, spacing 500 -> ys -1000,-500,0,500,1000
        const ys = [0, 1, 2, 3, 4].map(s => battleLinePosition(-1, s, 5, 3000, 500)[1]);
        expect(ys).toEqual([-1000, -500, 0, 500, 1000]);
    });

    it("puts a lone player dead center on Y", () => {
        expect(battleLinePosition(1, 0, 1, 3000, 500)[1]).toBe(0);
    });

    it("keeps every slot on its team's line", () => {
        for (let slot = 0; slot < 5; slot++) {
            expect(battleLinePosition(1, slot, 5, 3000, 500)[0]).toBe(3000);
        }
    });
});
