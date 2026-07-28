import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

/**
 * Vanish (spec 010): 1 s of true invisibility. The engine renders the
 * invisibility fade/shimmer itself once the state + level are declared; the
 * cast-time smoke puff lives in the ability.
 */
@registerModifier()
export class modifier_pudge_wars_vanish extends BaseModifier {
    IsHidden(): boolean {
        return false;
    }
    IsPurgable(): boolean {
        return false;
    }

    CheckState(): Partial<Record<ModifierState, boolean>> {
        return { [ModifierState.INVISIBLE]: true };
    }

    DeclareFunctions(): ModifierFunction[] {
        return [ModifierFunction.INVISIBILITY_LEVEL];
    }

    GetModifierInvisibilityLevel(): number {
        return 1;
    }
}
