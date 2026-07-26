/**
 * Balanced team split for e2e bot seats.
 *
 * `dota_create_fake_clients` seats fake clients with NO team: on a two-team
 * game they sit unassigned through hero selection, `SetCustomGameForceHero`
 * never fires for them, and the harness drives zero heroes for the whole
 * match (verified live in the 2026-07-26 VM smoke — nine seated bots, one
 * hero, no kills). Archer-wars never hit this because its 10-teams-of-one
 * FFA auto-assigned every joiner to the next free team; a 5v5 split has to
 * be made explicitly, and this is the one place that decides it.
 *
 * Pure math, no engine globals — unit-tested on Node.
 */
export function teamForSeat<T>(seatIndex: number, teams: readonly T[]): T {
    return teams[seatIndex % teams.length];
}
