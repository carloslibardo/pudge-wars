# Spec 013 — Physical shop pads + Meteor item

## What the player experiences

**Shop pads.** Each base has a visible glowing SHOP PAD on the ground behind
the spawn line. Pudges physically **walk onto the pad to buy** — you see a bot
break off from the fight, run home, stop on the glowing circle, the gold
popup + purchase sound fire, and it runs back. (2026-07-29 field report: "I
didn't see any pudge going into shop to buy itens" — buys were instant
teleport-grants, invisible as behavior.)

**Meteor.** A new top-shelf shop item: **Meteor Hook** (`item_pudge_meteor`).
Active: target a point; a warning ring flashes, then a flaming meteor crashes
down — AoE damage and a **stun** with visible stars. Bots buy it and slam it
on hooked victims mid-swarm.

## Numbers

| Value | Number | Source |
|---|---|---|
| Shop pad position | (±3650, 0), radius 400 | DESIGN-FRESH — behind SPAWN_LINE_X 3000, inside court extent ±4096 |
| Pad FX | `particles/items_fx/aegis_beacon.vpcf` column (VPK-verify before use; fallback rune glow) | VPK adjacency rule (spec 010 landmine) |
| Bot shop trip trigger | gold ≥ next catalog pick AND not retreating/swarming/hunting | DESIGN-FRESH |
| Meteor cost | 1200, maxStacks 1 | DESIGN-FRESH — priciest item, post-boots goal |
| Meteor cast range | 1200 | DESIGN-FRESH |
| Meteor delay | 0.9 s warning ring | DESIGN-FRESH — dodgeable, skillshot ethos |
| Meteor radius | 300 | DESIGN-FRESH |
| Meteor damage | 200 magical | DESIGN-FRESH |
| Meteor stun | 1.5 s | user field report ("meteor skill that stun enemy") |
| Meteor cooldown | 20 s | DESIGN-FRESH |
| Passive income | +50 gold / 10 s, all players | classic Pudge Wars periodic income (funds the shop; makes the 1200 meteor reachable) |
| Designated meteor buyers | seats with `pid % 4 == 1` save for it | DESIGN-FRESH — without a saver rule no bot ever holds 1200 unspent |

## Out of scope

- Native shop UI proximity enforcement for HUMAN players (map has no shop
  trigger entity; universal shop stays on for humans — mapgen shop entity is a
  recorded follow-up). Bots always walk; that is what the video shows.
- Meteor as a hero ability (it is an item — the field report asked for shop
  depth).

## Acceptance

- [ ] Marker contract BEFORE implementation
- [ ] Pure trip/decision logic unit-tested
- [ ] e2e: `[SHOP] trip` markers ≥ 6, buys only within pad radius (bot path),
      `[METEOR]` cast ≥ 2, stun modifier applied
- [ ] Frames: bot standing ON glowing pad at a [SHOP] timestamp; meteor fall +
      stun stars at a [METEOR] timestamp
- [ ] Engine surprises → CLAUDE.md
