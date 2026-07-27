# Spec 003 — Rot + Flesh Heap

Two more Pudge abilities, bundled because they share the passive/toggle shape.

## What the player experiences

**Rot (W)** — a toggle. While on, a stinking cloud pulses around Pudge,
damaging every nearby enemy AND Pudge himself each tick, and slowing enemies
caught in it. It can never kill Pudge — the self-damage stops at 1 HP. Toggle it
off to stop bleeding yourself. It is how you finish a hooked victim.

**Flesh Heap (E)** — a passive. Every enemy Pudge you kill makes you
permanently tougher: bonus max HP and a sliver of magic resistance, stacking
with no cap. A fed Pudge is a wall.

## Numbers

| Value | Number | Source |
|---|---|---|
| Rot radius | 275 u | DESIGN-FRESH (Dota Rot is 250) |
| Rot enemy damage / tick | 12/16/20/24 (per level) | DESIGN-FRESH rev 2026-07-27: tier-2 run 10 measured a ~23s match — stacked 60 DPS clouds plus a global 30 HP/s self-bleed gave a ~6s TTK in a scrum. Retuned for a ~30s solo-Rot TTK on a ~850 HP Pudge: Rot softens and finishes, the hook stars. |
| Rot self-damage / tick | 8 | DESIGN-FRESH rev 2026-07-27 (same measurement) |
| Rot tick interval | 0.5 s | DESIGN-FRESH |
| Rot move slow | 20 % | DESIGN-FRESH |
| Flesh Heap HP / stack | 40 | DESIGN-FRESH (Dota is ~14) |
| Flesh Heap magic resist / stack | 0.6 % | DESIGN-FRESH |
| Flesh Heap resist cap | 60 % | DESIGN-FRESH (engine caps ~ anyway) |

## Out of scope

- Rot leaving a lingering ground patch — it follows Pudge only.
- Flesh Heap granting the Dota strength stat (we grant flat HP instead — no
  attributes UI in this mode).

## Acceptance

- [x] Marker contract written before implementation
- [x] Pure logic unit-tested: `rotSelfDamage` (never suicides),
      `fleshHeapBonus` (stacks -> HP + capped resist)
- [ ] e2e: Rot ticks damage; a Flesh Heap stack lands on kill (GPU host)
- [ ] Frame: Rot cloud visible around a toggled-on Pudge (GPU host)
- [x] Engine surprises recorded in `CLAUDE.md`
