/**
 * Match-wide tunables that are NOT owned by a KV file — mode rules, spawn
 * geometry, the river band. One source of truth, imported by GameMode and the
 * systems. (Ability/item numbers live in their KV `AbilityValues`, read via
 * `GetSpecialValueFor`; these are the mode-level knobs KV has no home for.)
 *
 * This module touches no engine globals, so it is safe to import anywhere and
 * could be unit-tested; it is plain data.
 */
import type { RiverBand } from "./lib/river";

/** First team to this many kills wins. */
export const KILLS_TO_WIN = 10;
export const RESPAWN_SECONDS = 5;
export const PLAYERS_PER_TEAM = 5;

/** Two-sided spawn lines (see `lib/battleLines.ts`), in Hammer units. */
export const SPAWN_LINE_X = 3000;
export const SPAWN_SPACING = 500;

/** Economy: enough starting gold for one cheap item, kills fund the rest. */
export const STARTING_GOLD = 600;
export const KILL_BOUNTY = 300;

/**
 * The river runs down the middle of the map on the X axis (the two teams split
 * left/right). A hero within this X band gets the river buff (spec 004). This is
 * a coordinate band by design — NOT `.vmap` geometry — so it is tunable here.
 */
export const RIVER_BAND: RiverBand = { axis: "x", min: -400, max: 400 };
export const RIVER_SCAN_INTERVAL = 0.25;
/** River buff strength. No KV ability backs the river, so its numbers live here
 *  (the documented home for mode-level values KV has no block for). */
export const RIVER_MOVE_SPEED_PCT = 12;
export const RIVER_HP_REGEN = 30;
