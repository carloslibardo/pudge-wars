# Marker contract — 012 dynamic movement + hazard river

e2e only (hazard ticks print only under e2e; damage applies always).

## Required

| Marker | Meaning |
|---|---|
| `[ROAM] waypoint bot <pid> n <count>` | bot picked its n-th roam waypoint |
| `[HAZARD] tick <dmg> on <ent>` | river hazard damaged a lingerer (throttled ~1/s per hero) |
| `[RIVER] buff applied/removed` | existing scan telemetry — kept |

Gates (vm-smoke):
- `[ROAM] waypoint` ≥ 40 across the match
- ≥ 1 `[HAZARD] tick` (mechanism proven live)
- 0 `[HAZARD] lethal` (the 1 HP floor held)
- Existing: no `[MOTION] STUCK`, no `lingerers [1-9]`, ≥ 2 `lingerers 0`

## Must NOT appear

- `[HAZARD] lethal` — a hero died to the river
- `[MOTION] STUCK`
- Script errors mentioning botRoam / riverBand / modifier_pudge_river
