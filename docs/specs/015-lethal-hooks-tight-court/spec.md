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

- [x] `[KILL]` scores follow drag completions (run 34: 17 kills, every enemy
      `[DRAG] complete` scored the same second; run 38: 100 hooks, PASS)
- [x] `[GIFT] shield ate hook` appears when a shielded hero is hooked
      (run 35: `redeemed shield by 4` → `shield ate hook on 238`)
- [x] Frames: narrow court + tight camera (run 34+), minimap painted
      (run 37 — vmat param is `Texture`, see CLAUDE.md), host HUD leveled
      with boots/greased hook/hook chain (run 34+)
- [x] Engine surprises → CLAUDE.md (vmat `Texture` param + conquest
      template; lead-envelope dodge geometry; opportunity-gated
      retreat/iron-gut smoke gates)

## Run ledger (2026-08-02)

| Run | Verdict | What it taught |
|---|---|---|
| 34 | FAIL (dodge) | lethal hooks proven; 97 s match starved gates; minimap txt needs `.vmat` extension; 0.4 s reaction > whole hook flight |
| 35 | FAIL (retreat) | meteor poke + shield loop proven; damage is bimodal → HP gates went opportunity-conditional; probe bot got executed mid-river |
| 36 | PASS | hazard probe retry works; minimap still grey — compiled vmat bound default_tga |
| 37 | FAIL (dodge flake) | minimap PAINTED (`Texture` param); dodge ~1/100 traced to intercept lead vs closest-approach tolerance |
| 38 | PASS | SELF_RADIUS 150: dodge alive; full green |
