# Playbook dogfood notes — building Pudge Wars

Raw friction log from building this game *with* the dota2-claude-playbook, as a
test of the playbook. Feeds playbook v1.1. Honest, not marketing.

## Skills used, and whether each earned its place

| Skill | Used for | Verdict |
|---|---|---|
| `sdd-feature` | Drove all 5 features (spec → plan → marker contract → implement → evidence → landmine) | **Kept me honest.** Writing the marker contract *before* code forced me to decide what "working" means for a hook/drag/river I can't run. Real value, low overhead. |
| `ability-modifier-patterns` | Every ability + modifier | **High value.** The "declare IsHidden/IsPurgable/RemoveOnDeath every time" and the particle Create/Destroy+**ReleaseParticleIndex** rules went straight into the code. Motion-modifier guidance was thinner (see gaps). |
| `tstl-lua-gotchas` | All vscripts | **Prevented bugs before they happened** — truthiness (`if (count > 0)`), no `Date.now()`, handle re-validation in the drag think. Did NOT warn about `Math.hypot` being unsupported (see gaps); that one I found by building. |
| `kv-authoring` | Hero/ability/item KV + loc | **The five-registrations checklist is the backbone.** Item ↔ class ↔ import ↔ precache ↔ loc — I leaned on it for every item. |
| `landmine-check` | Before each commit | **Worked as a pre-commit gate.** Base-hero-name, precache, universal-shop-mode, spawn-reposition all caught by the sweep. |
| `evidence-gate` | Claim discipline throughout | **This is the spine of the whole thing.** The tier table (log line ≠ frame) is exactly right for this engine. It is why my final report does NOT claim the abilities "work" — only that they compile, unit-test, and are contracted. |
| `debug-silent-failures` | Consulted for the symptom table | Didn't hit a silent failure to diagnose (no engine to run), but the table is the right reference and shaped where I put marker prints. |

## Gaps / friction that should feed v1.1

1. **`tstl-lua-gotchas` misses the stdlib gaps.** `Math.hypot` errors the build
   (`TSTL: Math.hypot is unsupported`); `Infinity`/`Number.POSITIVE_INFINITY`
   are risky sentinels. These are loud, not silent, but they cost a build cycle
   and belong in that skill's "semantics that silently differ" neighbour — a
   short "stdlib TSTL does NOT emit" list. (Recorded in CLAUDE.md invariants.)
2. **No skill covers horizontal/vertical motion modifiers.** `ability-modifier-
   patterns` covers thinkers but not `ApplyHorizontalMotionController` /
   `UpdateHorizontalMotion` / `OnHorizontalMotionInterrupted` / releasing the
   controller in `OnDestroy` — which is exactly what a hook-drag (a very common
   custom-game mechanic) needs. This is the single biggest content gap for a
   *Pudge Wars specifically*, and probably for knockbacks/pulls generally.
3. **The typings lie by omission.** `GetIntervalThinkTime()` exists in-engine but
   not in `@moddota/dota-lua-types`. Nothing in the playbook prepares you for
   "the method is real but `tsc` rejects it." A one-liner in `tstl-lua-gotchas`
   ("when a real method is missing from the typings, store the value yourself —
   don't cast") would save the confusion.
4. **Particle paths are unknowable without a GPU host, and the playbook knows it
   but offers no list.** `evidence-gate` correctly says a log line doesn't prove
   a particle rendered — but for a *new* effect you also can't know the path is
   even valid. A short curated list of known-good Pudge/generic particle paths
   in `kv-authoring` or an appendix would remove a whole class of guessing. My
   river buff particle is an unverified guess, flagged as such.
5. **`sdd-feature` implies one marker contract per feature; the task wanted one
   consolidated contract.** Minor, but I ended up writing both (per-feature +
   `MARKERS.md`). The skill could mention that a game-level rollup contract is
   fine and often what a rig actually greps.
6. **Template `addoninfo.txt` / `GameMode.ts` ship as FFA (10 teams).** Fine as a
   template default, but converting to two teams meant touching `addoninfo.txt`
   `TeamCount`, `MapSelectionGroups`, the team list, spawn logic, net-table
   semantics, and the HUD — several files with no single "team layout" pointer.
   A note in `STRUCTURE.md`-equivalent ("changing team count touches these N
   places") would help. The FFA→2-team seam is a likely first edit for many games.
7. **`GameMode.Precache` is `this: void` static** — easy to forget particles must
   be added there, not in the ability's own `Precache`. The template comment is
   good; a lint (the playbook mentions `/landmine-check` sweeps precache) would
   be better but isn't automated.

## Could a stranger have done this?

**Mostly yes, if they read the skills first — which is the whole gamble.** The
skills are good enough that following them produces correct-by-construction KV
five-registrations, leak-free modifiers, and an honest evidence stance. A
stranger would have hit the same three unlisted walls I did (Math.hypot,
motion-modifier API, missing typings) and lost the same ~10-15 minutes each,
because none are in the skills yet. They would NOT have known the river particle
path is a guess unless they internalised `evidence-gate`'s "a frame, not a log
line" — which is the skill doing its job. Verdict: the playbook gets you to a
*compiles + unit-tested + contracted* build reliably; the last mile (does it
render, does it feel right) is exactly the part it is honest about not being able
to close without a GPU host, and that honesty is its best feature.

## Tier-2 addendum — the VM smoke, run for real (2026-07-26)

The GPU-host gap above got closed: the archer-wars rig was ported
(`scripts/vm.sh smoke`, `vm-smoke.ps1`, `vm-link.ps1` — shared VM, reused
`aw_qgate` Interactive task, stock `dota` map since no `.vmap` exists yet).
Four runs to green, and every red run was a REAL bug the tier-1 build could
not see — which is the strongest possible argument for the rig:

1. **Run 1: two-team seating gap.** `dota_create_fake_clients` seats clients
   with no team. Archer-wars' 10-teams-of-one auto-assigned every joiner; on a
   two-team game the nine bots sat out hero selection unassigned, and
   `SetCustomGameForceHero` never touched them. Nine seated bots, one hero,
   zero kills. Fix: explicit balanced `SetCustomTeamAssignment` sweep in the
   setup window + `CreateHeroForPlayer` fallback at engage. **Feeds the
   playbook's FFA→2-team seam note (gap 6): the seam is deeper than KV — it
   reaches bot seating.**
2. **Run 2: nobody levels a bot's abilities.** Nine live Pudges converged
   (river buffs flowing — the coordinate band works on a stock map, as
   designed) but zero [HOOK] lines: the hook sat at level 0 and
   `IsFullyCastable()` is false at level 0. Nothing in the template or skills
   mentions this; every bot-driven e2e will hit it. **Playbook v1.1: the
   e2e-harness chapter needs an "ability points don't spend themselves" line.**
3. **Run 3: clock, not code.** First kill lands ~t+215s (GPU warmup + convergence),
   then ~1 per 20-25s; a 300s window can't fit three-per-team. 480s + an
   early-exit-on-WIN check can.
4. **Run 4: PASS.** `[E2E] WIN team 2 reached 3 kills`, 117 hooks fired, 18
   full drags, 21 river buff applications, zero script errors.

Still honest about what this is NOT: the smoke proves the mechanics fire and
kill in-engine on a stock map. It does not prove they LOOK right (frames are
tools-mode with the Asset Browser over the game window), the rot toggle never
engaged (the leveling loop maxes hook before touching Rot — follow-up), and
`pudge_wars.vmap` still does not exist. Frame-quality evidence is the next
mode to port (`match`/`showcase`), after the map.

## Tier-2 addendum, part 2: full-system gates + recorded video (2026-07-27, runs 5-10)

Round two raised the bar from "a team wins" to "every system leaves evidence":
the smoke now HARD-FAILS unless `[ROT] tick`, `[FLESH] stack` and
`[SHOP] purchased` all appear alongside `[E2E] WIN`, zero script errors, and a
produced recording. Six runs to green; the reds found two real game bugs and a
stack of harness/testrig landmines:

1. **Runs 5-9: `modifier_pudge_rot` never ran — vanilla NAME SHADOWING.**
   The headline find of the whole exercise. `modifier_pudge_rot` and
   `modifier_pudge_flesh_heap` are the names of Dota's own engine-registered
   C++ modifiers for vanilla Pudge, and `LinkLuaModifier` cannot shadow a
   built-in: every application path resolves the name to the inert C++
   modifier — `HasModifier()` returns true, and not one Lua callback ever
   runs. No error, ever. Four application mechanisms "succeeded" silently
   (CAST_TOGGLE order, `ToggleAbility()`, `AddNewModifier`-by-name,
   `modifier.apply()`); lifecycle probes on OnCreated/OnDestroy finally proved
   the class was never instantiated. Fix: `_wars_` infix on every modifier
   whose name collides with a stock hero's kit. **Playbook v1.1: custom
   modifiers (and probably abilities) for a re-kitted stock hero MUST NOT
   reuse the stock kit's modifier names — and only a marker-gated tier-2 run
   can tell you, because everything else looks like success. Flesh Heap's
   stacks even "worked" via GameMode's SetStackCount landing on the vanilla
   modifier while the custom HP-per-stack logic was dead.**
2. **Fake clients cannot reach toggle abilities through the order pipeline.**
   A CAST_TOGGLE order is clobbered by the same think's Queue:false move/cast
   order, and `ToggleAbility()` is a silent no-op on an `ability_lua` toggle
   from server script. The harness drives the modifier directly
   (`modifier.apply()`, the same call OnToggle makes); the toggle switch
   itself stays a human-playtest item.
3. **Slot-order leveling starves later abilities of evidence** (run 4's PASS
   shipped Rot with zero ticks). Points now spread lowest-level-first, and a
   1300 XP boost at the horn (the L3 curve step is 640 — 600 buys two points,
   not three) puts all three abilities at level 1 before the first kill.
4. **Bots now buy from the catalog** through the same pure `purchase()` rule
   the design pins (cost + stack caps, per-seat rotation for diversity) —
   `AddItemByName` + `SpendGold`, grant-first so a full inventory can't burn
   gold. The native shop event can never fire for a fake client.
5. **Recording: ffmpeg gdigrab + window wrangling, fragmented mp4.** The
   archer pattern (minimize "Asset Browser", pin "Dota 2" topmost every poll
   cycle) works verbatim. `frag_keyframe+empty_moov` matters: the smoke
   early-exits on WIN and hard-stops ffmpeg, which corrupts a plain mp4's
   trailer but leaves a fragmented one playable to the last complete fragment.
6. **Testrig flakes**: the IAP tunnel must be retried as a unit with the ssh
   probe (gcloud's own preflight dies against a booting Windows before sshd is
   up — a leftover tunnel from an earlier session had masked this); T4
   capacity in us-central1-a can STOCKOUT (retry loop, or zones b/f).

Green run (artifacts/smoke/20260727T121355Z): `[E2E] WIN team 2 reached 3
kills` with 135 rot ticks, 4 flesh stacks, 12 shop purchases, 9 hooks/4 drags
(rot now finishes what hooks start), zero script errors, and pw-record.mp4
(~3.6min, 15fps) showing load → match → "Radiant Victory" with the fake-player
kill feed on screen. With rot live, 5 kills landed in ~25s of combat — the
600s window is now generous.

Still open: `pudge_wars.vmap` (smoke runs on the stock map by design),
match/showcase modes for curated frame-quality evidence, and Rot balance
itself (3 rot-fed kills in half a minute says the numbers need a design pass
once a human plays).

**Rot balance closed (run 11, 2026-07-27):** 12/16/20/24 per tick + self 8
(spec 003 rev). Horn→WIN went 23s → 43s; the kill feed is hook-led again
(12 drags feeding 4 kills, 460 rot ticks softening instead of deciding).
Evidence: artifacts/smoke/20260727T125733Z.

## Tier-2 addendum, part 3: marker-green is not gameplay-right (2026-07-27, run 12)

The reviewer watched run 11's "green" video and rejected it: stock Dota
jungle instead of the traditional two-fields-and-a-river arena, a mid-river
melee brawl instead of a hook war, and a camera that never framed the action.
Every gate was green while the GAME was wrong. Root causes, in playbook
terms:

1. **Markers measure mechanics, not shape.** [HOOK]/[ROT]/[WIN] prove code
   paths fire; they say nothing about WHERE the fight happens or what it
   looks like. The fix was three design-level changes markers could never
   have demanded: an uncrossable river (lib/sideLock order filter + stranded
   return, [SIDE] marker), bank-hold bot behavior (hold your side, hook
   across), and the generated traditional map (mapgen/ port: flat court,
   real water river, facing spawn rows, rim wall).
2. **Static frames lied by omission.** The run-11 "review" was three
   hand-picked frames; the reviewer watched the video. New rule: a recorded
   run is reviewed as a FRAME STRIP across the whole match window, and the
   reviewer's question is "is this the game?" not "is something on screen?"
3. **The camera needs a subject.** +dota_camera_lock on the host hero,
   parked mid-river as an invisible invulnerable tripod, frames both banks
   for the entire match — the archer finding (engine convar beats both
   script camera routes for match recordings) held exactly.

Run 12 evidence (artifacts/smoke/20260727T152402Z): generated map compiled
(vpk 4.2MB), hook accuracy 51/56 latched (91% — bank duels at fixed range),
33 drags, 560 rot ticks, 4 flesh stacks, 12 buys, 8 stranded returns, WIN in
110s, and the frame strip shows the classic layout: two green fields, wide
river, five Pudges per bank, hooks visibly crossing the water with dragged
victims. Playbook v1.1 items: port tiers 3-4 (frame evidence) BEFORE calling
any visual mode done; add "vanilla-map smoke is a bootstrap, not a
deliverable" to the testrig chapter.

## Tier-2 addendum, part 4: the reference-game checklist and liveness gates (2026-07-27, runs 13-14)

Run 12 fixed the map and the melee brawl — and the reviewer STILL rejected the
video, correctly: both teams stood in one motionless stack each, nothing ever
spawned in the river, and no purchase was visible anywhere on screen. Three
distinct process failures, three new rules:

1. **A reference game is a feature CHECKLIST, not a vibe.** "Traditional Pudge
   Wars" was researched for run 12, but only the pieces already broken (map,
   river, sides) were extracted from that research. The river-item mechanic —
   as canonical as the hook itself — was never even specced, so no gate could
   miss it. Rule: when a build claims to remake game X, the research pass must
   produce an explicit feature inventory of X, and every line gets a spec, a
   deliberate out-of-scope entry, or a user decision. Unwritten = unshipped =
   undetectable.
2. **Behavior needs LIVENESS gates, not just event gates.** Every marker is an
   event counter; a match where all ten bots stand still after t+30s fires
   every event the contract lists. The executor bug (each bot mirrored its
   nearest enemy's Y — a positive feedback loop that collapses both teams into
   stacks) shipped precisely because nothing measured motion over time. Rule:
   any autonomous actor gets a liveness audit — the harness samples positions
   every think and prints per-bot travel per 30s window (`[MOTION] audit`,
   spec 007); `[MOTION] STUCK` is a forbidden pattern. Static-but-green can no
   longer pass.
3. **"The system works" must be visible IN THE VIDEO, or it does not count as
   shipped.** Purchases were real (gold debited, items in bot inventories,
   hook bonuses live) and utterly invisible in the recording — which is what
   the user was reviewing. Rule: every player-facing system names, in its
   spec, the on-screen artifact a frame reviewer must be able to point at
   (overhead gold alert for buys, a glowing chest mid-river for gifts, spread
   formations for bot play), and the marker contract's frame-windows section
   says WHEN to look.

The harness side of the same lesson: the e2e executor is part of the product's
evidence chain. If the bots do not exercise a mechanic (hunt the chest, hold a
formation, spend gold on screen), tier-4 review cannot see it — bot behavior
gaps become invisible feature gaps. Budget executor work as feature work, not
as test plumbing.

**Run 13 (FAIL, by design):** every new gate went green on its own subsystem —
21 gifts spawned/hooked/redeemed, 153 motion audits with zero STUCK, 9/9
inventories, 193 hook latches — and the run still failed on the WIN gate:
ZERO kills in nine minutes. Formation play had removed the accidental
kill-engine (run 12's death-clump), a caught victim landed at one lone Rot,
and the 3 s stranded sweep (or a walk home through the water — the river is
uncrossable by ORDERS, not physics) freed it every time. Also caught: gift
hunters skipped the rot-off branch and self-bled 8 hp/s all match (5716
hit-0 rot ticks). A fix landing one gate while silently breaking another is
exactly what the full-set gate exists for.

**Run 14 (PASS):** swarm-the-catch (every bot within 1500 converges on a
hooked intruder and re-hooks it deeper) + 8 s grace + rot-off ordering. WIN
in 2:20 of match with a contested 2-1 scoreline, 5/5 gifts collected, 72
hooks / 48 latched, 667 rot ticks with victims in the cloud, 12 buys + 9/9
inventory audits, 10 stranded returns, zero STUCK, zero script errors.
Frame strip: the chest RENDERS mid-river (real model, not an ERROR mesh),
a hooked chest slides across the water with a STUNNED drag and a +855 heal
popup, and both teams hold spread, visibly moving lines. Evidence:
artifacts/smoke/20260727T184835Z.

Rig lore added this arc: macOS BSD grep silently treats a console.log with
stray control bytes as binary and reports ZERO matches with exit 1 — always
`grep -a` when scanning pulled Dota logs, or the census reads all-zeros on a
perfectly good run. And vm.sh's evidence pulls must verify byte sizes: scp
over the IAP tunnel truncated a 61 MB recording to 16 MB behind a masked
exit code.

## Tier-2 addendum, part 5: liveness gates as a debugging engine (2026-07-28, runs 15-20)

Six-item field-report iteration (river-parking bug, tactics port, hook-chain
legibility, three new actives, shop listing, real 10-kill win). Five smoke
runs failed before run 20 went green, and every failure was a REAL defect the
gates converted from "invisible in a green run" to "named line in a log":

- Run 15: retreat-camp (STUCK) — threshold flap parked bots at the entry HP.
- Run 16: kill starvation (no WIN at 7 kills) + travel-0 bots — the archer
  no-op-move landmine, plus survivability stacking (hysteresis+heals+gut).
- Run 17: perma-brawl (STUCK) — re-hooks reset the stranded clock forever;
  the sweep must PAUSE during motion control, never reset.
- Run 18: pace still short (9 kills) — three new skills diluted the
  lowest-first level spread; L1 combat can't close against L1 escapes.
- Run 19: residual micro-lock — a FindClearSpace nudge at the bot's own
  position is itself a no-op; watchdogs must escalate to a DIFFERENT place.

Lessons for playbook v1.1: (1) every behavior fix gets re-judged by the FULL
gate set — four of five regressions were introduced by the previous fix;
(2) survivability features (escapes, immortality, heals) silently tax the
win-condition pace — pin a pace gate (kills inside the window) whenever you
add them; (3) watchdog actions must be provably different from the state
they rescue (nudge-to-self is a no-op); (4) engine truth: CAST_POSITION
bypasses order filters and walks casters into range — range-gate every
scripted cast. Green: run 20 — 16 kills to a 10-6 Dire Victory, 336 hooks,
34 gifts, 29 vanish / 41 gut / 319 sprint, 0 STUCK, 0 lingerers, frame strip
verified (vanish puff, chain+dragged victim over water, empty river, victory
banner). Evidence: artifacts/smoke/20260728T140245Z.
