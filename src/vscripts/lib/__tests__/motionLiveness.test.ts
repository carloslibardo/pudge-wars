import { describe, expect, it } from "vitest";
import { addTravel, isStuck, STUCK_THRESHOLD } from "../motionLiveness";

describe("addTravel", () => {
    it("accumulates euclidean steps", () => {
        let t = 0;
        t = addTravel(t, [0, 0], [3, 4]);
        t = addTravel(t, [3, 4], [3, 104]);
        expect(t).toBe(105);
    });

    it("first sample (no prev) adds nothing", () => {
        expect(addTravel(0, undefined, [500, 500])).toBe(0);
    });
});

describe("isStuck", () => {
    it("flags totals under the threshold", () => {
        expect(isStuck(STUCK_THRESHOLD - 1, STUCK_THRESHOLD)).toBe(true);
        expect(isStuck(STUCK_THRESHOLD, STUCK_THRESHOLD)).toBe(false);
    });

    it("a full window of strafing alone clears the threshold by an order of magnitude", () => {
        // 60 thinks, direction flips every 2 thinks, each flip walks 240 units:
        // far more than 300 — the gate only catches genuinely parked bots.
        let travel = 0;
        for (let tick = 1; tick <= 60; tick++) {
            const y = (tick % 4) < 2 ? 120 : -120;
            const prevY = ((tick - 1) % 4) < 2 ? 120 : -120;
            travel = addTravel(travel, [450, prevY], [450, y]);
        }
        expect(travel).toBeGreaterThan(3000);
        expect(isStuck(travel, STUCK_THRESHOLD)).toBe(false);
    });
});
