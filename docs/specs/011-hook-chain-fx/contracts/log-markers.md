# Marker contract — 011 hook chain

Printed only when `pudge_wars_e2e 1`.

## Required

| Marker | Meaning |
|---|---|
| `[CHAIN] attached <pid>` | chain particle created at hook fire |
| `[CHAIN] released <pid> <hit\|miss\|drag_complete\|interrupted>` | chain particle destroyed with reason |

Gates (vm-smoke):
- `[CHAIN] attached` count ≥ 20 (a real match fires far more hooks)
- attached − released ≤ 2 (at most the in-flight hooks at match end; a bigger
  imbalance means leaked particles)

## Must NOT appear

- Script errors mentioning `hookChain` / `pudge_meathook`
- `[CHAIN] attached` without a matching hook `[HOOK] fired` in the same second
