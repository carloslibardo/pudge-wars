# Pudge Wars — consolidated log-marker contract

The single greppable contract a future headless engine run (`/vm-testrig`,
`+pudge_wars_e2e 1`) must satisfy to call the build a PASS. Per-feature detail
lives in each spec's `contracts/log-markers.md`; this file is the union.

Every marker is emitted by `lib/markers.ts` (pure string builders, unit-tested
in `lib/__tests__/markers.test.ts`) and printed only when `e2eEnabled()` is
true — so a real match stays silent (see /tstl-lua-gotchas: gate diagnostic
prints behind a convar). Because the strings come from one module, the contract
and the code cannot drift: the test asserts the exact prefixes below.

## Required markers (must all appear across a full run)

| # | Prefix | Emitted when | Builder |
|---|--------|--------------|---------|
| 1 | `[HOOK] fired` | Meat Hook projectile leaves the caster | `Marker.hookFired` |
| 2 | `[HOOK] latched` | the projectile latches its first enemy | `Marker.hookLatched` |
| 3 | `[DRAG] complete` | the hooked victim arrives at the caster | `Marker.dragComplete` |
| 4 | `[RIVER] buff applied` | a hero enters the river band and is buffed | `Marker.riverBuff` |
| 5 | `[SHOP] purchased` | a Pudge buys a custom item | `Marker.itemPurchased` |
| 6 | `[E2E] kill scored` | a kill is credited to a team's total | `Marker.killScored` |
| 7 | `[E2E] WIN` | a team reaches the kill target | `GameMode.onEntityKilled` |
| 8 | `[GIFT] spawned` | a river chest is created mid-river (spec 006) | `Marker.giftSpawned` |
| 9 | `[GIFT] redeemed` | a hooked chest arrives and pays out | `Marker.giftRedeemed` |
| 10 | `[MOTION] audit` | per-bot travel audit each liveness window (spec 007) | `Marker.motionAudit` |
| 11 | `[SHOP] audit` | bots-holding-items count each window; final must be `n/n` | `Marker.shopAudit` |
| 12 | `[CHAIN] attached/released` | hook chain particle lifecycle; ≥20 attached, imbalance ≤2 (spec 011) | `Marker.chainAttached/Released` |
| 13 | `[ROAM] waypoint` | a bot picked a roam waypoint; ≥40 across the match (spec 012) | `Marker.roamWaypoint` |
| 14 | `[HAZARD] tick` | river burn damaged a lingerer; ≥1 required, `lethal` forbidden (spec 012) | `Marker.hazardTick` |
| 15 | `[SHOP] trip start/arrive` | bot walked to the shop pad; ≥6 arrives (spec 013) | `Marker.shopTripStart/Arrive` |
| 16 | `[METEOR] cast/impact` | meteor item used; ≥1 cast + ≥1 nonzero impact (spec 013) | `Marker.meteorCast/Impact` |
| 17 | `[GIFT] dwell ok` | first hook attempt on a chest aged ≥6 s; ≥3 (spec 014) | `Marker.giftDwellOk` |

Full example lines (verbatim shapes the rig greps):

```
[HOOK] fired by 0 dir (0.71,0.71)
[HOOK] latched enemy 34 by 0
[DRAG] complete victim 34 -> caster 0
[RIVER] buff applied to 18
[SHOP] purchased item_pudge_hook_chain by 0
[E2E] kill scored team 2 -> 1
[E2E] WIN team 2 reached 10 kills
[GIFT] spawned at y -700
[GIFT] hooked by 3
[GIFT] redeemed gold by 3
[MOTION] audit bot 3 travelled 2145 in 30s
[SHOP] audit bots_with_items 9/9
```

## Forbidden patterns (any occurrence fails the run)

- `Script Error` / `attempt to index` / `a nil value`
- `unit ... is invalid` (un-precached hero/particle)
- `loop or previous error loading module` (require cycle)
- `error in error handling` (debug lib missing / sourceMapTraceback on)
- `bogus player id` (bots seated too late)
- `[MOTION] STUCK` (a bot stood still for a full liveness window — the run-12
  static-blob failure; spec 007)
- `Cannot create an entity because entity class is NULL` (unit KV missing
  `BaseClass`)
- `[HAZARD] lethal` (the river killed someone — the 1 HP floor broke; spec 012)
- `[GIFT] dwell violation` (a bot sniped a chest younger than 5 s; spec 014)

## Known-benign noise

- `The CJS build of Vite's Node API is deprecated` — vitest only, host side.
- Panorama `[UI] Hud loaded` — expected once per client.

## Frame windows (tiers 3-4, require a GPU host — NOT runnable on this machine)

- Hook flight + latch: the ~1 s after each `[HOOK] fired`. A reviewer must SEE
  the hook chain particle travel and the victim slide back — a log line proves
  the branch ran, only a frame proves the chain rendered (invisible-particle
  class, /evidence-gate).
- River buff: any frame while a hero stands in the mid-map band — the river
  buff particle must be visible on the unit.
- River gift: any frame between `[GIFT] spawned` and its `redeemed` — a glowing
  chest in the water at map center (an ERROR mesh fails); the ~2 s after
  `[GIFT] hooked` must show the chest sliding toward a bank.
- Formation/liveness: any two strip frames ≥15 s apart — each team spread along
  its bank (no single stack) with per-bot displacement between the frames.
