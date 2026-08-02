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
    sideReturned: (heroEnt: number): string => `[SIDE] stranded hero ${heroEnt} returned home`,
    itemPurchased: (itemName: string, pid: number): string =>
        `[SHOP] purchased ${itemName} by ${pid}`,
    shopAudit: (withItems: number, total: number): string =>
        `[SHOP] audit bots_with_items ${withItems}/${total}`,
    giftSpawned: (y: number): string => `[GIFT] spawned at y ${y}`,
    giftHooked: (pid: number): string => `[GIFT] hooked by ${pid}`,
    giftRedeemed: (kind: string, pid: number): string => `[GIFT] redeemed ${kind} by ${pid}`,
    motionAudit: (pid: number, units: number, windowSeconds: number): string =>
        `[MOTION] audit bot ${pid} travelled ${units} in ${windowSeconds}s`,
    motionStuck: (pid: number): string => `[MOTION] STUCK bot ${pid}`,
    riverLingerers: (count: number): string => `[RIVER] audit lingerers ${count}`,
    roamWaypoint: (pid: number, n: number): string => `[ROAM] waypoint bot ${pid} n ${n}`,
    hazardTick: (dps: number, ent: number): string => `[HAZARD] tick ${dps} on ${ent}`,
    shopTripStart: (pid: number, gold: number): string => `[SHOP] trip start bot ${pid} gold ${gold}`,
    shopTripArrive: (pid: number): string => `[SHOP] trip arrive bot ${pid}`,
    meteorCast: (pid: number): string => `[METEOR] cast by ${pid}`,
    meteorImpact: (victims: number): string => `[METEOR] impact victims ${victims}`,
    giftDwellOk: (age: number): string => `[GIFT] dwell ok age ${age}`,
    giftDrifting: (dir: number): string => `[GIFT] drifting dir ${dir}`,
    hookShielded: (victim: number): string => `[GIFT] shield ate hook on ${victim}`,
    chainAttached: (pid: number): string => `[CHAIN] attached ${pid}`,
    chainReleased: (pid: number, reason: string): string => `[CHAIN] released ${pid} ${reason}`,
    fxTestRow: (row: number, mode: string, fx: string, y: number): string =>
        `[FXTEST] row ${row} mode ${mode} y ${y} fx ${fx}`,
    fxTestDone: (rows: number): string => `[FXTEST] panel done ${rows} rows`,
    dodgeSidestep: (pid: number): string => `[DODGE] sidestep by ${pid}`,
    retreat: (pid: number, hpPct: number): string => `[RETREAT] bot ${pid} hp ${hpPct}`,
    skillUsed: (name: string, pid: number): string => `[SKILL] used ${name} by ${pid}`,
    killScored: (team: number, total: number): string =>
        `[E2E] kill scored team ${team} -> ${total}`,
    botTeamAssigned: (pid: number, team: number): string =>
        `[E2E] bot ${pid} assigned team ${team}`,
    botHeroCreated: (pid: number): string => `[E2E] hero created for heroless bot ${pid}`,
    botAbilityLeveled: (pid: number, ability: string, level: number): string =>
        `[E2E] bot ${pid} leveled ${ability} -> ${level}`,
    win: (team: number, kills: number): string => `[E2E] WIN team ${team} reached ${kills} kills`,
} as const;
