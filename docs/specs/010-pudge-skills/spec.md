# Spec 010 — New Pudge skills: Vanish, Iron Gut, Sprint

## What the player experiences

Three new active buttons past the classic trio, each with an unmistakable
on-screen tell:

- **Vanish** — 1 s of true invisibility. Blink-style smoke puff on cast, the
  engine's invisibility shimmer/fade while active. An escape blink-reflex:
  disappear as the enemy hook flies.
- **Iron Gut** — 2 s of immortality (invulnerable; hooks cannot latch you
  while it runs). Golden aegis-resurrection flash on cast. The panic button
  when the pack collapses on you.
- **Sprint** — +40% move speed for 3 s with the haste rune's red speed
  streaks. Close a kill, run a chest down, or flee.

## Numbers (all DESIGN-FRESH)

| Skill | Duration | Cooldown | Mana | Max level | FX (VPK-verified) |
|---|---|---|---|---|---|
| `pudge_wars_vanish` | 1 s | 20 s | 50 | 1 | `particles/items_fx/blink_dagger_start.vpcf` + engine invis state |
| `pudge_wars_iron_gut` | 2 s | 45 s | 75 | 1 | `particles/items2_fx/aegis_respawn.vpcf` |
| `pudge_wars_sprint` | 3 s | 15 s | 25 | 1 | `particles/generic_gameplay/rune_haste_owner.vpcf` |

Hero gets Ability4/5/6; e2e XP boost rises so bots can afford one point in
each (6 abilities ≥1 point → level 7 boost).

## Bot usage (e2e harness, spec 009 tactics integration)

- Vanish: when threatened — an enemy with hook OFF cooldown within its hook
  range — and own hook is on cooldown (nothing better to do than not be hit).
- Iron Gut: HP below 25% with an enemy within 900 (the pack is closing).
- Sprint: when swarming a catch or retreating at low HP.

## Out of scope

- Leveling scaling (all three are one-point actives this pass).
- New items keying off these skills.

## Acceptance

- [ ] Marker contract before implementation
- [ ] KV blocks + registered classes + GameMode imports + precache (L3/L8)
- [ ] e2e: each skill used ≥1 (`[SKILL] used <name> by <pid>`)
- [ ] Frame evidence: smoke puff / golden flash / speed streaks each visible
      in the window after its first `[SKILL]` marker
