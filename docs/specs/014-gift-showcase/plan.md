# Plan — 014 gift showcase

1. `systems/riverGifts.ts` — spawn beacon (teleport_end column, timed destroy),
   1.6× model scale, global Rune.Bounty chime, `age()` accessor.
2. `config.ts` — GIFT_HUNT_DELAY 6.
3. Harness gift branch — dwell gate (< delay → line up on bank, strafing);
   `[GIFT] dwell ok` on first allowed shot per chest.
4. `abilities/pudge_meat_hook.ts` — dwell-violation audit print in the gift
   branch (bot hook on a chest younger than 5 s).

## Global Constraints (CLAUDE.md)

- Un-precached particle renders nothing — beacon precached + VPK-verified.
- Looping particles must be explicitly destroyed (timed) or they persist.
