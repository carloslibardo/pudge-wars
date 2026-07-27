/**
 * The e2e convar gates, split out of `e2eHarness.ts` so that MODIFIERS can
 * check them. Abilities/modifiers (rot, hook drag) print their `[E2E]`-era
 * markers behind `e2eEnabled()`, and the harness needs to import those same
 * modifier classes to drive them directly — keeping the flag in the harness
 * file made that an import cycle (modifier -> harness -> modifier), which
 * TSTL resolves to a half-initialized module at runtime.
 *
 * Convars:
 *   pudge_wars_e2e         1 engages the harness (default 0, tools mode only)
 *   pudge_wars_e2e_kills   win-threshold override, to keep runs bounded
 */
export function e2eEnabled(): boolean {
    return IsInToolsMode() && (Convars.GetInt("pudge_wars_e2e") ?? 0) > 0;
}

/** The real win threshold, unless a smaller smoke-run override is set. */
export function e2eKillTarget(fallback: number): number {
    if (!e2eEnabled()) return fallback;
    const override = Convars.GetInt("pudge_wars_e2e_kills") ?? 0;
    return override > 0 ? override : fallback;
}
