# Spec 006 — River gifts (hook-to-collect drops)

## What the player experiences

Every so often a glowing treasure chest drifts into the middle of the river —
in plain view of both banks, and unreachable on foot (the river is uncrossable,
spec 004). The only way to claim it is the only way to do anything in Pudge
Wars: **hook it**. A hook that latches the chest drags it back across the water
to the caster, who pops it open on arrival and receives one of three gifts —
a purse of gold, a full heal, or a free item from the shop catalog.

This recreates the traditional Pudge Wars river-rune mechanic: the river is not
just a wall, it is the mid-map prize lane both teams fight over (original
WC3 Pudge Wars / Pudge Wars Reloaded river item spawns — see the research
notes in `docs/PLAYBOOK-NOTES.md` part 3 sources: Hive Workshop v2.03d thread,
gaming-tools.com Pudge Wars guide).

A gift chest cannot be damaged by Rot clouds drifting over the river (it sits
at x=0; Rot's radius from the bank hold line cannot reach it) and takes only
incidental hook damage; it never fights back and never moves on its own.

## Numbers

| Value | Number | Source |
|---|---|---|
| Spawn interval | 25 s | DESIGN-FRESH (bounded so a 3-kill smoke sees ≥2 gifts) |
| Max alive at once | 1 | traditional PW: one contested prize at a time |
| Spawn X | 0 (river center) | spec 004 river band |
| Spawn Y range | ±1400 | inside court halfHeight 2600, clear of rim |
| Chest HP | 300 | DESIGN-FRESH (survives stray hook damage 90+40×N a while) |
| Gift: gold purse | 250 gold | DESIGN-FRESH (≈ one cheap catalog item per 2 gifts) |
| Gift: heal | 100% max HP | traditional PW regen rune analog |
| Gift: free item | 1 random catalog item | traditional PW item-drop analog |
| Reward weights | uniform 1/3 each | DESIGN-FRESH |

## Out of scope

- Multiple simultaneous chests, escalating gift tiers, cursed gifts.
- Chest stealing mid-drag (whoever latched it gets it; a second hook cannot
  re-latch a chest already being dragged).
- Any walk-up collection — the river stays uncrossable; hooks are the only
  collector.

## Acceptance

- [ ] Marker contract written (`contracts/log-markers.md`) BEFORE implementation
- [ ] Pure logic unit-tested: reward choice, spawn-Y placement, spawn gating
      (`lib/riverGift.ts`)
- [ ] e2e: `[GIFT] spawned` and `[GIFT] redeemed` both appear; bots hook chests
- [ ] Frame evidence: a chest visible mid-river; a chest mid-drag across water
- [ ] Any engine surprise recorded in `CLAUDE.md` invariants
