import { describe, expect, it } from "vitest";
import { teamForSeat } from "../botTeams";

describe("teamForSeat", () => {
    const TEAMS = [2, 3] as const; // DOTA_TEAM_GOODGUYS, DOTA_TEAM_BADGUYS

    it("alternates seats across the two teams", () => {
        expect(teamForSeat(0, TEAMS)).toBe(2);
        expect(teamForSeat(1, TEAMS)).toBe(3);
        expect(teamForSeat(2, TEAMS)).toBe(2);
        expect(teamForSeat(3, TEAMS)).toBe(3);
    });

    it("splits nine bots 5/4 — never more than one seat apart", () => {
        const counts = new Map<number, number>();
        for (let seat = 0; seat < 9; seat++) {
            const team = teamForSeat(seat, TEAMS);
            counts.set(team, (counts.get(team) ?? 0) + 1);
        }
        expect(counts.get(2)).toBe(5);
        expect(counts.get(3)).toBe(4);
    });
});
