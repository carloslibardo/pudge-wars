# Spec 011 — Visible hook chain

## What the player experiences

When any Pudge fires Meat Hook, a **chain of metal links visibly extends** from
the caster to the flying hook head, stays taut while a caught victim (or river
chest) is dragged home, and retracts when the hook misses. This is the
signature visual of Pudge Wars — a hook whose chain cannot be seen reads as a
bug (2026-07-29 field report: "I cannot see the chains").

Root cause of the invisible chain: `pudge_meathook.vpcf` was passed as the
linear projectile's `EffectName`. That particle is a **control-point-driven
beam** — CP0 is the chain's anchor (the caster), CP1 is the hook head — and the
projectile system does not drive those CPs, so nothing rendered.

## Numbers

| Value | Number | Source |
|---|---|---|
| Chain particle | `particles/units/heroes/hero_pudge/pudge_meathook.vpcf` | VPK-verified 2026-07-29: basename `pudge_meathook` under dir `particles/units/heroes/hero_pudge` |
| CP0 anchor | caster ABSORIGIN_FOLLOW | DESIGN-FRESH — attach-point names are not VPK-verifiable (live in model binary); origin-follow is guaranteed to render |
| CP1 update rate (flight) | every `OnProjectileThink` | engine callback rate |
| CP1 update rate (drag) | every `UpdateHorizontalMotion` frame | engine callback rate |
| Retract speed on miss | 2 × hook_speed | DESIGN-FRESH — snappy return, no lingering beam |

## Out of scope

- Cosmetic hook-head projectile FX (engine already renders the projectile FX).
- Attach-point polish (weapon-hand anchor) — origin anchor first; polish only
  if a frame shows it reading wrong.

## Acceptance

- [ ] Marker contract written BEFORE implementation
- [ ] e2e run prints `[CHAIN]` attach/release balanced with hooks fired
- [ ] Frame evidence: chain links visible mid-flight over the river AND during
      a drag, at the recording's 1280-wide scale
- [ ] Any engine surprise recorded in `CLAUDE.md` invariants
