import { isInRiver } from "../lib/river";
import { Marker } from "../lib/markers";
import { RIVER_BAND, RIVER_SCAN_INTERVAL } from "../config";
import { e2eEnabled } from "./e2eFlags";

const RIVER_MODIFIER = "modifier_pudge_river";

/**
 * The river running down the middle of the map — implemented as a COORDINATE
 * band, not `.vmap` geometry (spec 004). On an interval it scans the live heroes
 * and toggles the river buff modifier: added when a hero is inside the band,
 * removed when they leave.
 *
 * Membership is the pure, unit-tested `isInRiver` (`lib/river.ts`); this system
 * is the thin engine shell. Add/remove is idempotent — guarded by
 * `HasModifier` — so a hero standing in the river never stacks two buffs (which
 * would double the regen, the exact bug the marker contract forbids).
 */
export class RiverSystem {
    constructor() {
        Timers.CreateTimer(RIVER_SCAN_INTERVAL, () => this.scan());
    }

    private scan(): number {
        const count = HeroList.GetHeroCount();
        for (let i = 0; i < count; i++) {
            const hero = HeroList.GetHero(i);
            if (!hero || hero.IsNull() || !hero.IsAlive()) continue;

            const origin = hero.GetAbsOrigin();
            const inside = isInRiver(origin.x, origin.y, RIVER_BAND);
            const has = hero.HasModifier(RIVER_MODIFIER);

            if (inside && !has) {
                hero.AddNewModifier(hero, undefined, RIVER_MODIFIER, {});
                if (e2eEnabled()) print(Marker.riverApplied(hero.entindex()));
            } else if (!inside && has) {
                hero.RemoveModifierByName(RIVER_MODIFIER);
                if (e2eEnabled()) print(Marker.riverRemoved(hero.entindex()));
            }
        }
        return RIVER_SCAN_INTERVAL; // re-arm
    }
}
