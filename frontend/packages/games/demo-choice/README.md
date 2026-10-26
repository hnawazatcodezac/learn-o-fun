# @learnofun/game-demo-choice

> **demo-choice is the platform's reference game,** made with `npm run create-game` for the game sandbox, the game shell and the conformance suite. It is not in the game catalog and is never offered to children, so it has no learning design and this brief stays as the template.

Demo choice: a game made with `npm run create-game`. Start from `BRIEF.md`, reviewed by the learning designer, before changing the game itself.

- `src/manifest.ts`: what the game is and can do (plan 6.2).
- `src/game.ts`: the `GameModule`. It renders items and reports answers through `ctx.respond`; it never grades, chooses items, changes difficulty or stores progress. `hint(level)` shows its own hint when the child presses the shell's hint button (ADR 0013); the starter crosses out a wrong answer.
- `src/stories.ts`: items to try the game with in each experience band, for the game sandbox and the conformance suite.
- `conformance/`: what the conformance suite needs (ADR 0014): the manifest, the stories and `answer()`, which answers an item with the keyboard only. Keep it in step with the game's controls. Run the suite with `npm run conformance`.
- Interface text is under `games.demoChoice` in the English catalog; content text comes from items through `ctx.localize`.

Rules in `.claude/rules/games.md`.
