---
paths:
  - "frontend/packages/game-sdk/**"
  - "frontend/packages/games/**"
  - "frontend/tools/game-sandbox/**"
  - "frontend/tools/conformance/**"
---

# Game rules

Plan section 6 and `docs/game-library.md` describe the framework and catalog.

- Start every new game from a brief using the template in `docs/game-library.md`. Do not write code for a game without one.
- Each game implements `GameModule` from `game-sdk`. The session engine owns the flow unless the manifest says `flow: 'self'`.
- Games render items and report responses. They never grade, choose items, change difficulty or store progress.
- Strings come from `ctx.t()`, audio from `ctx.audio`, randomness from `ctx.rng`.
- Respect `reducedMotion`, sound and `textScale` settings. Never rely on colour alone.
- Keyboard and switch operable. Touch targets at least 64 px for ages 3–5.
- Budgets: game bundle at most 1.5 MB excluding shared runtime and audio; 60 fps and under 3 s load on a mid-range tablet.
- Each game ships with sandbox stories for every experience band it supports and must pass the conformance suite (`npm run conformance`). Its `conformance/driver.ts` answers items with the keyboard only; keep it in step with the game's controls (ADR 0014).
- Show a hint the child asks for in `hint(level)`, and keep taking the answer (ADR 0013).
- Answer tiles use the UI kit's `lf-answer` classes and the `ui.answer.*` words, never a game's own tile styles (ADR 0020).
- Self-driven games report evidence only through `ctx.observe()`. Creative games report participation, never correctness.
