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

Full example lines (verbatim shapes the rig greps):

```
[HOOK] fired by 0 dir (0.71,0.71)
[HOOK] latched enemy 34 by 0
[DRAG] complete victim 34 -> caster 0
[RIVER] buff applied to 18
[SHOP] purchased item_pudge_hook_chain by 0
[E2E] kill scored team 2 -> 1
[E2E] WIN team 2 reached 10 kills
```

## Forbidden patterns (any occurrence fails the run)

- `Script Error` / `attempt to index` / `a nil value`
- `unit ... is invalid` (un-precached hero/particle)
- `loop or previous error loading module` (require cycle)
- `error in error handling` (debug lib missing / sourceMapTraceback on)
- `bogus player id` (bots seated too late)

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
