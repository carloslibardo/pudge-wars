import { describe, expect, it } from "vitest";
import { Marker } from "../markers";

// The rig greps these exact prefixes; if a builder changes shape, this test —
// not a silent scan miss on a GPU host hours later — is what fails.
describe("Marker", () => {
    it("builds the hook lifecycle markers", () => {
        expect(Marker.hookFired(0, 0.71, 0.71)).toBe("[HOOK] fired by 0 dir (0.71,0.71)");
        expect(Marker.hookLatched(0, 34)).toBe("[HOOK] latched enemy 34 by 0");
        expect(Marker.dragComplete(34, 0)).toBe("[DRAG] complete victim 34 -> caster 0");
    });

    it("builds the rot / flesh heap markers", () => {
        expect(Marker.rotTick(15, 2)).toBe("[ROT] tick self 15 hit 2");
        expect(Marker.fleshStack(3, 18)).toBe("[FLESH] stack 3 on 18");
    });

    it("builds the river markers", () => {
        expect(Marker.riverApplied(18)).toBe("[RIVER] buff applied to 18");
        expect(Marker.riverRemoved(18)).toBe("[RIVER] buff removed from 18");
    });

    it("builds the shop + score markers", () => {
        expect(Marker.itemPurchased("item_pudge_hook_chain", 0)).toBe(
            "[SHOP] purchased item_pudge_hook_chain by 0",
        );
        expect(Marker.killScored(2, 1)).toBe("[E2E] kill scored team 2 -> 1");
        expect(Marker.win(2, 10)).toBe("[E2E] WIN team 2 reached 10 kills");
    });

    it("builds the e2e bot seating markers", () => {
        expect(Marker.botTeamAssigned(4, 3)).toBe("[E2E] bot 4 assigned team 3");
        expect(Marker.botHeroCreated(7)).toBe("[E2E] hero created for heroless bot 7");
        expect(Marker.botAbilityLeveled(3, "pudge_meat_hook", 1)).toBe(
            "[E2E] bot 3 leveled pudge_meat_hook -> 1",
        );
    });
});
