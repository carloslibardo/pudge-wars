/**
 * Engine shell for the uncrossable river (lib/sideLock.ts):
 *
 *  1. An execute-order filter clamps every MOVE_TO_POSITION target to the
 *     mover's own bank — humans and harness bots alike (ExecuteOrderFromTable
 *     passes through the filter too), so nobody walks across.
 *  2. A sweep returns stranded heroes: a victim dragged across by a hook is
 *     legitimately on the wrong side — it gets a grace window to fight or die
 *     there, then is teleported back to its own bank so the match keeps
 *     flowing instead of leaving a lost Pudge behind enemy lines.
 */
import { sideForTeam } from "../lib/battleLines";
import { clampMoveX, onWrongSide } from "../lib/sideLock";
import { RIVER_BAND } from "../config";
import { Marker } from "../lib/markers";
import { e2eEnabled } from "./e2eFlags";

/** Walkable margin between the river edge and the closest allowed stand. */
const BANK_MARGIN = 50;
/** Seconds a dragged hero may stay on the enemy field before being sent home.
 *  8s, up from 3 (run 13): with formation play a caught Pudge lands at ONE
 *  enemy, and 3s of a single Rot could never kill — 0 kills in 9 minutes. The
 *  grace must outlast the pack's collapse-and-kill (spec 007 swarm). */
const STRANDED_GRACE = 10;
/** In-band (water) grace — a SEPARATE, shorter clock (spec 012): the hazard
 *  burn starts at 4 s, this sweep is the backstop behind it. Splitting it from
 *  STRANDED_GRACE keeps the run-13 behind-enemy-lines kill window intact. */
const RIVER_GRACE = 6;
const SWEEP_INTERVAL = 0.5;

export class SideLockSystem {
    /** entindex -> game time the hero was first seen stranded. */
    private strandedSince = new Map<EntityIndex, number>();

    constructor() {
        GameRules.GetGameModeEntity().SetExecuteOrderFilter(
            order => this.filterOrder(order),
            this,
        );
        Timers.CreateTimer(SWEEP_INTERVAL, () => {
            this.sweep();
            return SWEEP_INTERVAL;
        });
    }

    private riverHalfWidth(): number {
        return RIVER_BAND.max; // band is symmetric around 0
    }

    private filterOrder(order: ExecuteOrderFilterEvent): boolean {
        if (order.order_type !== UnitOrder.MOVE_TO_POSITION) return true;
        const unit = EntIndexToHScript(order.units["0"]) as CDOTA_BaseNPC | undefined;
        if (!unit || !unit.IsRealHero()) return true;
        const side = sideForTeam(unit.GetTeamNumber());
        if (side === undefined) return true;
        order.position_x = clampMoveX(side, order.position_x, this.riverHalfWidth(), BANK_MARGIN);
        return true;
    }

    private sweep(): void {
        const now = GameRules.GetGameTime();
        const half = this.riverHalfWidth();
        const count = HeroList.GetHeroCount();
        for (let i = 0; i < count; i++) {
            const hero = HeroList.GetHero(i);
            if (!hero || hero.IsNull() || !hero.IsAlive()) continue;
            const side = sideForTeam(hero.GetTeamNumber());
            if (side === undefined) continue;
            // e2e only: the host's hero is the invisible camera TRIPOD parked
            // mid-river on purpose — washing it to a bank (run 15) would
            // deframe the entire recording. Real players are always swept.
            if (e2eEnabled() && !PlayerResource.IsFakeClient(hero.GetPlayerOwnerID())) continue;
            const ent = hero.entindex();
            // "Stranded" = not standing on your own field: across the river OR
            // parked inside the water band (spec 008 — the river is never a
            // resting state; run 14 ended with three heroes idling in it).
            // Mid-drag heroes are the hook's business, not ours.
            const x = hero.GetAbsOrigin().x;
            const wrongSide = onWrongSide(side, x, half);
            const offOwnField = wrongSide || Math.abs(x) <= half;
            // Mid-drag heroes are the hook's business — but only PAUSE the
            // clock, never reset it: run 17 showed a swarm re-hooking its
            // catch every few seconds, resetting the timer forever and locking
            // a permanent point-blank brawl (the travel-0 "stuck" bots).
            if (hero.IsCurrentlyHorizontalMotionControlled()) continue;
            if (!offOwnField) {
                this.strandedSince.delete(ent);
                continue;
            }
            const since = this.strandedSince.get(ent);
            if (since === undefined) {
                this.strandedSince.set(ent, now);
                continue;
            }
            if (now - since < (wrongSide ? STRANDED_GRACE : RIVER_GRACE)) continue;
            this.strandedSince.delete(ent);
            const y = hero.GetAbsOrigin().y;
            const home = GetGroundPosition(Vector(side * (half + BANK_MARGIN * 2), y, 0), hero);
            FindClearSpaceForUnit(hero, home, true);
            hero.Stop();
            if (e2eEnabled()) print(Marker.sideReturned(hero.entindex()));
        }
    }
}
