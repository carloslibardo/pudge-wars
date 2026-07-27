import { BaseModifierMotionHorizontal, registerModifier } from "../lib/dota_ts_adapter";
import { dragStep, hasArrived } from "../lib/hook";
import { Marker } from "../lib/markers";
import { e2eEnabled } from "../systems/e2eFlags";

/** How close (units) the victim must get before the drag is called complete. */
const ARRIVAL_THRESHOLD = 100;

/**
 * The drag half of Meat Hook: a horizontal motion modifier applied to the
 * VICTIM that walks it toward the caster each engine frame, then destroys
 * itself on arrival. Extends the horizontal-motion base so the engine drives
 * `UpdateHorizontalMotion`.
 *
 * Handle hygiene matters here: the caster handle is re-fetched and null-checked
 * every frame — a stale handle indexed in a motion update is exactly the kind of
 * error that kills a think silently forever (/tstl-lua-gotchas). The step
 * distance is `drag_speed * dt` and the arrival snap live in `lib/hook.ts`.
 */
@registerModifier()
export class modifier_pudge_hook_drag extends BaseModifierMotionHorizontal {
    private dragSpeed = 0;

    IsHidden(): boolean {
        return false;
    }
    IsPurgable(): boolean {
        return false; // a purge should not free a hooked victim mid-flight
    }
    RemoveOnDeath(): boolean {
        return true; // victim died while being dragged — stop
    }

    OnCreated(): void {
        if (!IsServer()) return;
        const ability = this.GetAbility();
        this.dragSpeed = ability !== undefined ? ability.GetSpecialValueFor("drag_speed") : 1000;
        // Engage the motion controller; if another one already owns this unit,
        // bail rather than fight it.
        if (!this.ApplyHorizontalMotionController()) {
            this.Destroy();
        }
    }

    CheckState(): Partial<Record<ModifierState, boolean>> {
        // The victim is helpless and passes through units while sliding home.
        return {
            [ModifierState.STUNNED]: true,
            [ModifierState.NO_UNIT_COLLISION]: true,
        };
    }

    UpdateHorizontalMotion(me: CDOTA_BaseNPC, dt: number): void {
        if (!IsServer()) return;
        const caster = this.GetCaster();
        if (!caster || caster.IsNull() || me.IsNull()) {
            this.Destroy();
            return;
        }
        const here = me.GetAbsOrigin();
        const home = caster.GetAbsOrigin();
        const step = this.dragSpeed * dt;
        const [nx, ny] = dragStep([here.x, here.y], [home.x, home.y], step);
        me.SetAbsOrigin(GetGroundPosition(Vector(nx, ny, 0), me));

        if (hasArrived([nx, ny], [home.x, home.y], ARRIVAL_THRESHOLD)) {
            if (e2eEnabled()) {
                print(Marker.dragComplete(me.entindex(), caster.GetPlayerOwnerID()));
            }
            this.Destroy();
        }
    }

    OnHorizontalMotionInterrupted(): void {
        if (!IsServer()) return;
        this.Destroy();
    }

    OnDestroy(): void {
        if (!IsServer()) return;
        // Motion controllers must be released or the unit stays under our control.
        if (!this.GetParent().IsNull()) {
            this.GetParent().InterruptMotionControllers(false);
        }
    }
}
