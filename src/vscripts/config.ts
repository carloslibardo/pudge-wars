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
/** Spec 013: classic Pudge Wars periodic income — funds the shop economy so
 *  losing players still shop and the 1200-gold Meteor is reachable. */
export const PASSIVE_GOLD_AMOUNT = 50;
export const PASSIVE_GOLD_INTERVAL = 10;

/**
 * The river runs down the middle of the map on the X axis (the two teams split
 * left/right). A hero within this X band gets the river buff (spec 004). This is
 * a coordinate band by design — NOT `.vmap` geometry — so it is tunable here.
 */
export const RIVER_BAND: RiverBand = { axis: "x", min: -400, max: 400 };
export const RIVER_SCAN_INTERVAL = 0.25;
/** River numbers. No KV ability backs the river, so they live here (the
 *  documented home for mode-level values KV has no block for).
 *
 *  Spec 012 / decision 2026-07-29-river-hazard: the regen is GONE — the river
 *  is a danger corridor, not a spa. +12% speed stays so crossings are quick;
 *  standing in the band past the grace burns (escalating, NEVER lethal — the
 *  1 HP floor keeps kills the enemy team's business). */
export const RIVER_MOVE_SPEED_PCT = 12;
/** Continuous in-band seconds before the burn starts. Must exceed the honest
 *  walk-home crossing (~2.6 s at 313 speed over the 800-unit band). */
export const RIVER_HAZARD_GRACE = 4;
export const RIVER_HAZARD_DPS = 30;
/** Extra DPS per full second past grace, capped. */
export const RIVER_HAZARD_RAMP = 10;
export const RIVER_HAZARD_CAP = 80;
export const RIVER_HAZARD_TICK = 0.5;

/** Shop pads (spec 013): buy zone behind each spawn line; bots walk there. */
export const SHOP_PAD_X = 3650;
export const SHOP_PAD_RADIUS = 400;

/** River gift dwell (spec 014): bots may not hook a chest younger than this. */
export const GIFT_HUNT_DELAY = 6;

/** River gifts (spec 006): a hookable chest mid-river on an interval. */
export const GIFT_SPAWN_INTERVAL = 25;
export const GIFT_SPAWN_Y_MAX = 1400;
export const GIFT_GOLD_PURSE = 250;
