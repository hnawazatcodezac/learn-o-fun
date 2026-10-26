# 0014. The conformance suite: keyboard drivers and the bundle budget

- Status: accepted
- Date: 2026-10-20
- Plan section: 6.7 (definition of done), 6.8 (conformance suite), 8.6 (accessibility); ADR 0012 (screen sizes)

## Context

Every game must pass a conformance suite (plan 6.8): lifecycle events, pause and resume, string catalog use, minimum viewport, keyboard reachability, automated accessibility rules and performance budgets. To check a game's events, pausing and layout through a whole session, the suite has to answer items in games it knows nothing about: a choice game is buttons, Hop Line is a point on a line. Plan 6.7 also caps a game's bundle at 1.5 MB "excluding shared runtime and audio" without saying how to measure it.

## Options considered

Playing a game:

1. **A keyboard driver per game.** Each game ships a small test driver that answers an item, right or wrong, with the keyboard only.
2. **Generic.** The suite sends correct answers straight to the session, bypassing the game's controls, and checks separately that everything in the game can be reached with Tab.

Measuring the bundle:

1. **Minified, uncompressed:** the game's own JavaScript, CSS, images and fonts as built.
2. **Compressed transfer size,** after gzip.

## Decision

The team chose a keyboard driver per game and the minified, uncompressed size.

- **Drivers.** Each game package exports `./conformance`: its manifest, its stories and `answer(stage, item, correct)`, which answers the item on screen using only the keyboard. `create-game` scaffolds it, and `tools/conformance` lists every game's entry; a check fails if a registered game has none. Because the suite answers through the game's own controls, a game that cannot be answered by keyboard fails, and so does one that takes answers while paused.
- **Budget.** A game's bundle is its own code built and minified as a library, with the shared runtime left out: the `@learnofun/*` packages, `zod` and React. Its CSS and its image and font files count; audio files do not. The limit is 1,500,000 bytes. Shared libraries a game adds later, such as PixiJS or Rive, join the shared list when they arrive.
- **What runs.** For every registered game and each of its stories: static checks of the manifest, stories and strings; the bundle budget; and, in the game shell and the sandbox, a keyboard play-through with lifecycle-event checks, a retry, a hint (Practice), Challenge mode, pausing, fit without overflow at 1024×600, 768×1024 and 360×640 (ADR 0012) in English and long pseudo-text, a rotation, no hard-coded text, right to left, visible keyboard focus, WCAG 2.2 AA, no motion under reduced motion, and an empty sandbox Problems list.
- **Not automated.** Loading in under 3 seconds on a mid-range tablet and holding 60 fps (plan 6.7) cannot be measured reliably in CI; they stay manual checks in each game's definition of done.

## Consequences

- Every game carries a little test code beside it, and keyboard operability is proven on every story, not only claimed in the manifest.
- The size limit is strict and the same everywhere; a game near it can still ship compressed.
- The suite runs the web app and the sandbox on ports of its own (5183 and 5186), so it never collides with a running dev server or another suite.
- `npm run e2e` now runs the Playwright suites one after another (`turbo run e2e --concurrency=1`). With the conformance suite added, running them all at once overloaded the machine and pushed a timing-sensitive web test past its limit; each suite still runs its own tests in parallel.
