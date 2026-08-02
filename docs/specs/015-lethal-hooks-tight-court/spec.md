# Spec 015 — Lethal hooks on a tight court

2026-08-02 field report, four coupled changes to the core loop.

## What the player experiences

A landed hook IS a kill: the victim is dragged home on the chain and executed
on arrival at the hooker's feet. Hooks fly noticeably faster, the court is
half as wide (everyone is always in someone's hook range), and the river's
shield gift is the one thing that saves you — it eats the next enemy hook
with an aegis flash.

## Numbers

| Value | Number | Source |
|---|---|---|
| Hook speed | 2400 (was 1600) | field report: "make hook be faster" |
| Drag speed | 1400 (was 1050) | execution should not dawdle; chain stays taut |
| Drag arrival | LETHAL to enemy heroes (PURE, health+maxHealth) | field report: "1 hook should kill people". Same-team saves stay non-lethal; chest drags redeem as before |
| Court half-width | 2150 (was 4300); spawn lines ±1500 (were ±3000) | field report: "reduce by half the width (largura) of the map" |
| Shop pads | ±1300 (were ±1900) | track the halved court |
| Roam maxX | 1150 (was 1800) | inside the new rim |
| e2e camera distance | 2000 (was 2400) | tighter court needs less glass |
| Shield gift | blocks ONE enemy hook latch, 60 s, aegis flash + sound | counterplay so lethal hooks stay a duel, not a coin flip |
| Haste gift | +40% MS, 8 s, haste-rune streaks | field report: "customize" the river bonuses |
| Gift kinds | gold 250 / full heal / free item / haste / shield — uniform five-way | spec 014 rev 3 |

## Acceptance

- [ ] `[KILL]` scores follow drag completions (a completed enemy drag = a kill)
- [ ] `[GIFT] shield ate hook` appears when a shielded hero is hooked
- [ ] Frames: spawn rows inside the narrow court; minimap shows the painted
      overview (not white); host HUD shows leveled skills + items
- [ ] Engine surprises → CLAUDE.md
