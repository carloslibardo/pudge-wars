# Spec 012 — Dynamic movement + hazard river (rev of 004/007/008)

## What the player experiences

**Movement.** Pudges play like players, not chess pieces: each bot roams its
own field between self-chosen waypoints — lurking deep, poking mid, pushing up
to the bank to line up hooks — spreads away from teammates instead of forming
a picket line, and jockeys unpredictably near the water. No two bots move
alike (seeded personas), and nobody stands still. (2026-07-29 field report:
"the movements are so robotic, could u ensure the bots play more dynamic?")

**River.** The river stops being a spa. The +30 HP/s regen is GONE; standing
in the water past a short grace sets you burning — a visible poison FX and
escalating damage that never quite kills (1 HP floor: your death belongs to
the enemy team, not the scenery). Crossing home after a hook drag is fast
(+12% speed kept) and safe within grace; RESTING there is punished by the map
itself, no matter what any bot logic does. Decision record:
`.shippit/decisions/2026-07-29-river-hazard.md` (C beat A/B 38–32–32).

## Numbers

| Value | Number | Source |
|---|---|---|
| Roam waypoint X band (own field) | bank 450 … 2400 from center, own side | DESIGN-FRESH |
| Roam waypoint Y band | ±2000 | court extent (mapgen test ±2560) |
| Waypoint hold | persona period 3–6 s, then repick | spec 009 personas |
| Teammate spacing bias | repel < 350 units | DESIGN-FRESH |
| Push/poke/lurk mix | aggression-weighted: push 45%, poke 35%, lurk 20% base | DESIGN-FRESH |
| River hazard grace | 4 s continuous presence | analyst: honest crossing ≈ 2.55 s at 313.6 speed over 800 units; 2.5 s spec draft REJECTED |
| Hazard damage | 30 HP/s, +10 HP/s each second after grace, cap 80 | DESIGN-FRESH |
| Lethality | NON-LETHAL, 1 HP floor | analyst: hazard deaths would suicide the kill feed (GameMode scores same-team as nothing) |
| Motion-controlled (dragged) | hazard clock PAUSES (never resets) | run-17 permanent-brawl lesson |
| River regen | DELETED (was +30 HP/s) | decision C |
| River move speed | +12% kept | crossing urgency |
| Wrong-side sweep grace | 10 s (UNCHANGED — run-13 kill window) | split from river grace |
| River-band sweep grace | 6 s | DESIGN-FRESH backstop > hazard grace |

## Out of scope

- Human-player movement (bots only).
- Pathfinding around terrain (court is flat).
- Hazard FX customization per team.

## Acceptance

- [ ] Marker contract BEFORE implementation
- [ ] Pure roam/waypoint/spacing + hazard-clock rules unit-tested
- [ ] e2e: `[ROAM]` repicks ≥ 40, zero `[MOTION] STUCK`, `[HAZARD] tick`
      present, zero `[HAZARD] lethal`, lingerer gates unchanged
- [ ] Frames: bot positions visibly varied across strip (no bank picket line)
- [ ] Engine surprises → CLAUDE.md
