import { BaseAbility, registerAbility } from "../lib/dota_ts_adapter";
import { hookDirection, sumHookBonuses, type HookBonus } from "../lib/hook";
import { trackHook } from "../lib/hookThreats";
import { Marker } from "../lib/markers";
import { GIFT_MATERIALIZE_SECONDS } from "../config";
import { e2eEnabled } from "../systems/e2eFlags";
import { modifier_pudge_hook_drag } from "../modifiers/modifier_pudge_hook_drag";
import { modifier_pudge_gift_shield } from "../modifiers/modifier_pudge_gift_shield";
import { HookChain } from "../systems/hookChain";
import { RiverGiftSystem } from "../systems/riverGifts";

/** 2-decimal round for the direction printed in the fired marker (e2e only). */
function round2(n: number): number {
    return Math.floor(n * 100 + 0.5) / 100;
}

/**
 * Meat Hook — Pudge's signature skillshot. Fire a hook chain in a straight line;
 * the FIRST enemy it touches is latched, damaged, and dragged all the way back
 * to the caster (the drag is `modifier_pudge_hook_drag`). Miss and only the
 * cooldown is spent.
 *
 * The engine's linear projectile does the live collision (like the template's
 * example ability); the hook GEOMETRY it implements — first-along-the-ray
 * selection and the drag walk — is pinned in `lib/hook.ts` and unit-tested.
 *
 * All numbers come from KV (`GetSpecialValueFor`). The per-item bonuses that
 * shop items add on top are folded in by the `hook*` accessors below (spec 005).
 */
@registerAbility()
export class pudge_meat_hook extends BaseAbility {
    /**
     * The hook bonuses granted by the caster's equipped hook items, summed by
     * the pure `sumHookBonuses`. Hook items carry `bonus_range`/`bonus_speed`/
     * `bonus_damage`; stat items read 0 for those keys. Inventory is scanned
     * only when the hook actually fires/hits, so the per-slot reads are cheap.
     */
    private itemHookBonus(caster: CDOTA_BaseNPC): HookBonus {
        const bonuses: HookBonus[] = [];
        for (let slot = 0; slot < 9; slot++) {
            const item = caster.GetItemInSlot(slot as InventorySlot);
            if (item === undefined) continue;
            const name = item.GetAbilityName();
            if (!name.startsWith("item_pudge_")) continue;
            bonuses.push({
                range: item.GetSpecialValueFor("bonus_range"),
                speed: item.GetSpecialValueFor("bonus_speed"),
                damage: item.GetSpecialValueFor("bonus_damage"),
            });
        }
        return sumHookBonuses(bonuses);
    }

    OnSpellStart(): void {
        const caster = this.GetCaster();
        const origin = caster.GetAbsOrigin();
        const cursor = this.GetCursorPosition();
        const [dx, dy] = hookDirection([origin.x, origin.y], [cursor.x, cursor.y]);
        const direction = Vector(dx, dy, 0);

        const bonus = this.itemHookBonus(caster);
        const range = this.GetSpecialValueFor("hook_range") + bonus.range;
        const speed = this.GetSpecialValueFor("hook_speed") + bonus.speed;
        const width = this.GetSpecialValueFor("hook_width");

        // No EffectName: pudge_meathook.vpcf is a CP-driven beam the projectile
        // system cannot animate (spec 011) — HookChain drives it instead.
        ProjectileManager.CreateLinearProjectile({
            Ability: this,
            Source: caster,
            vSpawnOrigin: (origin + direction * 80) as Vector,
            fDistance: range,
            fStartRadius: width,
            fEndRadius: width,
            vVelocity: (direction * speed) as Vector,
            // BASIC on top of HERO so the projectile also latches the river
            // gift chest (spec 006) — the only non-hero unit in the game. The
            // chest sits on NEUTRALS, hostile to both teams, so ENEMY covers it.
            iUnitTargetTeam: UnitTargetTeam.ENEMY,
            iUnitTargetType: UnitTargetType.HERO + UnitTargetType.BASIC,
            bProvidesVision: true,
            iVisionRadius: 300,
        });
        caster.EmitSound("Hero_Pudge.AttackHookExtend");
        HookChain.attach(caster);

        // Spec 009: every hook self-registers as a dodgeable threat — the
        // engine has no API to enumerate live projectiles (archer pattern).
        trackHook({
            origin: [origin.x, origin.y],
            dir: [dx, dy],
            speed,
            range,
            radius: width,
            firedAt: GameRules.GetGameTime(),
            team: caster.GetTeamNumber(),
        });

        if (e2eEnabled()) {
            print(Marker.hookFired(caster.GetPlayerOwnerID(), round2(dx), round2(dy)));
        }
    }

    /** Engine callback per server tick while the linear projectile flies. */
    OnProjectileThink(location: Vector): void {
        HookChain.updateHead(this.GetCaster(), location);
    }

    /** Return true to consume the projectile (the first hero hit stops it). */
    OnProjectileHit(target: CDOTA_BaseNPC | undefined, _location: Vector): boolean {
        const caster = this.GetCaster();
        if (!target || target.IsNull()) {
            // Max distance, or the victim died mid-flight: reel the chain in.
            const retractSpeed =
                (this.GetSpecialValueFor("hook_speed") + this.itemHookBonus(caster).speed) * 2;
            HookChain.retract(caster, retractSpeed);
            return true;
        }

        // River gift chest (spec 006): no damage, no steal — just latch and
        // drag it home; the drag modifier redeems it on arrival.
        if (RiverGiftSystem.isGift(target)) {
            // Materializing chest (spec 014): the beacon phase is look, don't
            // touch — the projectile flies on to whatever is behind it.
            const chestAge = RiverGiftSystem.age();
            if (chestAge !== undefined && chestAge < GIFT_MATERIALIZE_SECONDS) return false;
            if (target.HasModifier("modifier_pudge_hook_drag")) {
                // Already claimed mid-drag by someone else — our hook got nothing.
                HookChain.retract(caster, this.GetSpecialValueFor("hook_speed") * 2);
                return true;
            }
            target.EmitSound("Hero_Pudge.AttackHookImpact");
            if (e2eEnabled()) {
                print(Marker.giftHooked(caster.GetPlayerOwnerID()));
                // Spec 014 dwell audit: bots are gated to ≥6 s chest age by the
                // harness; a younger hook here means the gate leaked.
                const age = RiverGiftSystem.age();
                if (age !== undefined && age < 5 && PlayerResource.IsFakeClient(caster.GetPlayerOwnerID())) {
                    print(`[GIFT] dwell violation age ${Math.floor(age)}`);
                }
            }
            modifier_pudge_hook_drag.apply(target, caster, this, {});
            return true;
        }

        // River shield gift (spec 014 rev 3): eats the hook instead of a latch
        // — the counterplay to lethal drags. Consume BEFORE damage: a shielded
        // hero takes nothing, and the chain reels back as on a miss.
        const shield = target.FindModifierByName("modifier_pudge_gift_shield");
        if (shield !== undefined && target.GetTeamNumber() !== caster.GetTeamNumber()) {
            (shield as modifier_pudge_gift_shield).consume();
            HookChain.retract(caster, (this.GetSpecialValueFor("hook_speed") + this.itemHookBonus(caster).speed) * 2);
            if (e2eEnabled()) print(Marker.hookShielded(target.entindex()));
            return true;
        }

        const damage = this.GetSpecialValueFor("hook_damage") + this.itemHookBonus(caster).damage;
        ApplyDamage({
            victim: target,
            attacker: caster,
            damage,
            damage_type: DamageTypes.MAGICAL,
            ability: this,
        });
        target.EmitSound("Hero_Pudge.AttackHookImpact");

        if (e2eEnabled()) {
            print(Marker.hookLatched(caster.GetPlayerOwnerID(), target.entindex()));
        }

        // The drag modifier moves the VICTIM toward the caster; caster + ability
        // are carried so it can read drag_speed from KV and print the marker.
        modifier_pudge_hook_drag.apply(target, caster, this, {});
        return true;
    }
}
