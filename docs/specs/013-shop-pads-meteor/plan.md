# Plan — 013 shop pads + meteor

1. KV: `npc_items_custom.txt` meteor block; `shops.txt` listing; loc tokens.
2. `lib/shop.ts` — catalog + new `active` kind; kvShop test learns per-kind
   ScriptFile + value keys.
3. `abilities/pudge_meteor.ts` — warning glow → warlock meteor fall → AoE
   damage + `modifier_pudge_meteor_stun` (generic_stunned swirl).
4. `systems/shopPads.ts` — glow ring at (±3650, 0), `onPad`/`padFor`.
5. Economy: passive income 50 g/10 s (GameMode timer); designated meteor-saver
   seats in `lib/botShopping.ts` (without saving, no bot ever holds 1200).
6. Harness: shop-trip phase machine (start/arrive markers, buys only on-pad);
   meteor slam in the swarm branch — never at a mid-drag victim (moves ~900
   units during the fall), velocity-led otherwise.

## Global Constraints (CLAUDE.md)

- Bots buy via AddItemByName + SpendGold (fake clients have no shop UI); the
  purchase RULES stay pure in lib/shop.
- purchase() reports gold before caps — saver rule must exclude capped actives.
- Humans keep universal shop (map has no native shop entity) — follow-up.
