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
