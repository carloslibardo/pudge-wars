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

## Acceptance

- [ ] `[SHOP] purchased <item> by 0` appears (gate) — host bought, not conjured
- [ ] `[E2E] bot 0 leveled …` entries SPREAD across the match timeline, not
      clustered at the horn
- [ ] Frames: host pudge centered; HUD level grows between early and late
      frames; inventory fills over time
- [ ] Full smoke still green (host as a 10th combatant must not break pace
      or liveness gates)
