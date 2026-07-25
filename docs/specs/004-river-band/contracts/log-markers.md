# Log markers — 004 River band

## Required
- `[RIVER] buff applied to <heroEnt>` — hero entered the band, modifier added.
- `[RIVER] buff removed from <heroEnt>` — hero left the band, modifier removed.

## Forbidden
- Two consecutive `[RIVER] buff applied` for the same ent with no `removed`
  between them — the idempotency check failed and regen is double-applied.
- `attempt to index` in the scan think — stale hero handle.

## Benign
- No river markers at all in a run where no bot ever crosses the mid-band — the
  e2e bots fight from their sides; the marker needs a hero to actually enter.
