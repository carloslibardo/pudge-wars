# Plan — 011 hook chain

1. `systems/hookChain.ts` — one chain per caster: attach (CP0 origin-follow),
   updateHead (CP1), release (idempotent, reasons), retract timer (miss).
2. `abilities/pudge_meat_hook.ts` — drop EffectName (the CP beam cannot be
   projectile-animated); attach at fire; OnProjectileThink drives CP1; miss →
   retract at 2× hook speed.
3. `modifiers/modifier_pudge_hook_drag.ts` — CP1 follows the victim each
   motion frame; OnDestroy releases the chain (arrival/death/interrupt).

## Global Constraints (CLAUDE.md)

- Attach-point names live in model binaries (not VPK-verifiable) — CP0 uses
  ABSORIGIN_FOLLOW, guaranteed to render.
- Particle leak = attach/release imbalance — gate allows ≤2 (in-flight at end).
