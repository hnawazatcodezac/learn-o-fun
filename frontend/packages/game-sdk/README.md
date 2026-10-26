# @learnofun/game-sdk

What every game implements, and how a session is run. Plan sections 6.1–6.3; rules in `.claude/rules/games.md`.

- `contract.ts`: `GameModule`, `GameInstance` and `GameContext` from plan 6.2. A game renders items and reports answers through `ctx.respond`; it never grades, chooses items, changes difficulty or stores progress. Strings come from `ctx.t`, audio from `ctx.audio`, randomness from `ctx.rng` and time from `ctx.clock`.
- `runner.ts`: `runSession(options)` mounts a game and connects it to the session engine in `@learnofun/learning-core`: it presents each item, waits for the answer, shows the feedback and passes every learning event to `emit`. It returns a controller to pause, resume, skip and end. The same seed reproduces the same session, event IDs included; the game's `ctx.rng` is a separate stream from the same seed. With a `policy`, an item `maker` and the child's starting ability (`learner`), the policy chooses each item and the engine makes it on demand; when the policy offers a break, the runner waits for `onOfferBreak` before the next item (ADR 0032, ADR 0036). Without them, the placeholder plays `items` in order, as a game's stories do.

Feedback with support `encouragement` or `hint` means the child tries the same item again.

May import only `@learnofun/contracts` and `@learnofun/learning-core`.
