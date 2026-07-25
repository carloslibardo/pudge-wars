/**
 * The log-marker vocabulary, in ONE place.
 *
 * Both the engine code (which prints these) and the marker contract
 * (`docs/specs/MARKERS.md`, which the VM rig greps) point at this module, so
 * the two cannot drift: `markers.test.ts` pins the exact prefixes. A renamed
 * marker breaks a test here before it silently breaks a rig scan there.
 *
 * These are compiled to Lua and called from the abilities/systems — but they
 * touch no engine globals, so they are also unit-testable on Node. Prints are
 * gated behind `e2eEnabled()` at the call site, never here: this module just
 * builds strings.
 */
export const Marker = {
    hookFired: (pid: number, dx: number, dy: number): string =>
        `[HOOK] fired by ${pid} dir (${dx},${dy})`,
    hookLatched: (pid: number, victimEnt: number): string =>
        `[HOOK] latched enemy ${victimEnt} by ${pid}`,
    dragComplete: (victimEnt: number, pid: number): string =>
        `[DRAG] complete victim ${victimEnt} -> caster ${pid}`,
    rotTick: (clampedSelfDmg: number, enemyCount: number): string =>
        `[ROT] tick self ${clampedSelfDmg} hit ${enemyCount}`,
    fleshStack: (stacks: number, heroEnt: number): string =>
        `[FLESH] stack ${stacks} on ${heroEnt}`,
    riverApplied: (heroEnt: number): string => `[RIVER] buff applied to ${heroEnt}`,
    riverRemoved: (heroEnt: number): string => `[RIVER] buff removed from ${heroEnt}`,
    itemPurchased: (itemName: string, pid: number): string =>
        `[SHOP] purchased ${itemName} by ${pid}`,
    killScored: (team: number, total: number): string =>
        `[E2E] kill scored team ${team} -> ${total}`,
    win: (team: number, kills: number): string => `[E2E] WIN team ${team} reached ${kills} kills`,
} as const;
