# Spec 016 — Player-POV camera: the host pudge plays

2026-08-03 field report: "the camera should follow the main pudge player and
centralize on him; pudge shouldn't have all skills available since we started
— upgrade while leveling up; items should be bought, not just appear."

## What the viewer experiences

The recording looks like a real player's screen: the camera stays centered on
one pudge that actually plays the match — roams, hooks, shops, dies, respawns.
Its HUD starts at level 1 with one skill point and visibly grows: skill-ups
land as kills feed XP, and items pop into the inventory only when the pudge
walks onto a shop pad and buys them.

## Mechanism

| Piece | How |
|---|---|
| Camera follow | `+dota_camera_lock 1` already follows the HOST's hero — the hero simply plays now instead of being an invisible mid-river tripod. Server `SetCameraTarget` and GameUI routes do NOT move the tools client (archer-wars audits 2026-07-09/11/14); the lock is the only working technique. |
| Host plays | `bots()` includes player 0; same FSM (roam, dodge, retreat, swarm, shop trips, gift hunts). Teams seat 5v5 (9 fakes + host). |
| Honest levels | Host is excluded from the 6500-XP horn boost; kills feed XP and `levelAbilities` spends points on camera. Fake clients keep the boost (pace). |
| Honest items | Host removed from the conjured loadout; the shop-trip AI buys at the pad with earned gold. |
| Hazard probe | Never picks the host — a stationary mid-river burn is bad footage and a free hook. |

## Acceptance (run 39, artifacts/smoke/20260803T150008Z — SMOKE PASS)

- [x] `[SHOP] purchased <item> by 0` — 7 buys (3× hook_chain + 2× greased
      hook are DESIGNED range/speed stacking, catalog caps enforced; plus
      2× rancid flask)
- [x] `[E2E] bot 0 leveled …` spread 14:55:11 → 14:57:32+ (hook → rot →
      flesh → vanish → gut → sprint → hook 2), none clustered at the horn
- [x] Frames: host centered mid-hook at 260 s (L8, K/D/A 3/4/2, 5 item
      slots filled); early frame L2 with one skill + one item
- [x] Full smoke green — host as 10th combatant broke nothing
