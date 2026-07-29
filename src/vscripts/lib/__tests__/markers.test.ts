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

    it("pins the side-lock return marker", () => {
        expect(Marker.sideReturned(42)).toBe("[SIDE] stranded hero 42 returned home");
    });

    it("builds the shop + score markers", () => {
        expect(Marker.itemPurchased("item_pudge_hook_chain", 0)).toBe(
            "[SHOP] purchased item_pudge_hook_chain by 0",
        );
        expect(Marker.killScored(2, 1)).toBe("[E2E] kill scored team 2 -> 1");
        expect(Marker.win(2, 10)).toBe("[E2E] WIN team 2 reached 10 kills");
    });

    it("builds the river gift markers (spec 006)", () => {
        expect(Marker.giftSpawned(-700)).toBe("[GIFT] spawned at y -700");
        expect(Marker.giftHooked(3)).toBe("[GIFT] hooked by 3");
        expect(Marker.giftRedeemed("gold", 3)).toBe("[GIFT] redeemed gold by 3");
    });

    it("builds the tactics + skills markers (specs 008-010)", () => {
        expect(Marker.riverLingerers(0)).toBe("[RIVER] audit lingerers 0");
        expect(Marker.dodgeSidestep(4)).toBe("[DODGE] sidestep by 4");
        expect(Marker.retreat(4, 28)).toBe("[RETREAT] bot 4 hp 28");
        expect(Marker.skillUsed("pudge_wars_vanish", 4)).toBe("[SKILL] used pudge_wars_vanish by 4");
        expect(Marker.chainAttached(3)).toBe("[CHAIN] attached 3");
        expect(Marker.chainReleased(3, "miss")).toBe("[CHAIN] released 3 miss");
        expect(Marker.roamWaypoint(2, 41)).toBe("[ROAM] waypoint bot 2 n 41");
        expect(Marker.hazardTick(40, 300)).toBe("[HAZARD] tick 40 on 300");
        expect(Marker.shopTripStart(5, 1200)).toBe("[SHOP] trip start bot 5 gold 1200");
        expect(Marker.shopTripArrive(5)).toBe("[SHOP] trip arrive bot 5");
        expect(Marker.meteorCast(5)).toBe("[METEOR] cast by 5");
        expect(Marker.meteorImpact(2)).toBe("[METEOR] impact victims 2");
        expect(Marker.giftDwellOk(7)).toBe("[GIFT] dwell ok age 7");
    });

    it("builds the liveness audit markers (spec 007)", () => {
        expect(Marker.motionAudit(3, 2145, 30)).toBe("[MOTION] audit bot 3 travelled 2145 in 30s");
        expect(Marker.motionStuck(3)).toBe("[MOTION] STUCK bot 3");
        expect(Marker.shopAudit(9, 9)).toBe("[SHOP] audit bots_with_items 9/9");
    });

    it("builds the e2e bot seating markers", () => {
        expect(Marker.botTeamAssigned(4, 3)).toBe("[E2E] bot 4 assigned team 3");
        expect(Marker.botHeroCreated(7)).toBe("[E2E] hero created for heroless bot 7");
        expect(Marker.botAbilityLeveled(3, "pudge_meat_hook", 1)).toBe(
            "[E2E] bot 3 leveled pudge_meat_hook -> 1",
        );
    });
});
