import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";
import { fleshHeapBonus } from "../lib/combat";

/**
 * The passive body of Flesh Heap: a permanent, undispellable modifier whose
 * stack count is its kill count. Purely declarative — it reads its own stacks
 * and turns them into bonus max HP and (capped) magic resistance through the
 * pure `fleshHeapBonus`. Stacks are incremented externally in
 * `GameMode.onEntityKilled`; nothing here mutates them.
 *
 * PERMANENT so it survives Pudge's death (the whole point — the bonus is
 * permanent), and RemoveOnDeath false to match.
 */
@registerModifier()
export class modifier_pudge_wars_flesh_heap extends BaseModifier {
    IsHidden(): boolean {
        return false;
    }
    IsPurgable(): boolean {
        return false;
    }
    RemoveOnDeath(): boolean {
        return false;
    }
    GetAttributes(): ModifierAttribute {
        return ModifierAttribute.PERMANENT;
    }

    DeclareFunctions(): ModifierFunction[] {
        return [
            ModifierFunction.EXTRA_HEALTH_BONUS,
            ModifierFunction.MAGICAL_RESISTANCE_BONUS,
        ];
    }

    GetModifierExtraHealthBonus(): number {
        return this.bonus().bonusHp;
    }

    GetModifierMagicalResistanceBonus(): number {
        return this.bonus().resistPct;
    }

    private bonus() {
        const a = this.GetAbility();
        const hpPerStack = a !== undefined ? a.GetSpecialValueFor("hp_per_stack") : 0;
        const resistPerStack = a !== undefined ? a.GetSpecialValueFor("resist_per_stack") : 0;
        const resistCap = a !== undefined ? a.GetSpecialValueFor("resist_cap") : 0;
        return fleshHeapBonus(this.GetStackCount(), hpPerStack, resistPerStack, resistCap);
    }
}
