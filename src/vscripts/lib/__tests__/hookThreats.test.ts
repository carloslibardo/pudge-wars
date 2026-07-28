import { beforeEach, describe, expect, it } from "vitest";
import {
    activeThreats,
    dodgeStep,
    incomingThreat,
    resetThreats,
    trackHook,
    threatExpired,
    type HookThreat,
} from "../hookThreats";

const hook = (over: Partial<HookThreat> = {}): HookThreat => ({
    origin: [-450, 0],
    dir: [1, 0],
    speed: 1500,
    range: 1400,
    radius: 100,
    firedAt: 100,
    team: 3,
    ...over,
});

beforeEach(() => resetThreats());

describe("registry", () => {
    it("prunes hooks that have flown their full range", () => {
        trackHook(hook());
        expect(activeThreats(100.5).length).toBe(1);
        expect(activeThreats(101).length).toBe(0); // 1500 u/s * 1s > 1400
        expect(threatExpired(hook(), 101)).toBe(true);
    });
});

describe("incomingThreat", () => {
    it("sees an enemy hook flying at us after the reaction delay", () => {
        const t = hook();
        expect(incomingThreat([450, 0], 2, [t], 100.2)).toBeUndefined(); // < 400ms reaction
        expect(incomingThreat([450, 0], 2, [t], 100.5)).toBe(t);
    });

    it("ignores own-team hooks and ones that pass wide", () => {
        expect(incomingThreat([450, 0], 3, [hook()], 100.5)).toBeUndefined(); // same team
        expect(incomingThreat([450, 400], 2, [hook()], 100.5)).toBeUndefined(); // 400 off-line
    });

    it("ignores hooks that land short of us", () => {
        const short = hook({ range: 500 });
        expect(incomingThreat([450, 0], 2, [short], 100.5)).toBeUndefined(); // we are 900 out
    });
});

describe("dodgeStep", () => {
    it("steps perpendicular on the side the bot already leans to", () => {
        const t = hook();
        const [, upY] = dodgeStep([450, 10], t, 250);
        const [, downY] = dodgeStep([450, -10], t, 250);
        expect(upY).toBe(260); // 10 + 250, away from the line upward
        expect(downY).toBe(-260);
    });
});
