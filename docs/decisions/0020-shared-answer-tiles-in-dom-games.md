# 0020. Shared answer tiles in DOM games: classes from the UI kit

- Status: accepted
- Date: 2026-10-21
- Plan section: 6.1 (three layers), 6.6 (design system); FRONTEND-KICKOFF step 3e

## Context

The design system specifies an AnswerTile: the large, pressable answer a child taps, with default, selected, correct and try-again states, each try-again and correct state marked by an icon and words. Step 3e asks for it in the demo game. Games render plain DOM and, by the boundary rules, import only `contracts` and `game-sdk`, so they cannot use a React component from `ui-kit`. Plan 6.6 wants one look across games ("recognisably Learnofun").

## Options considered

1. **Shared classes.** `ui-kit`'s stylesheet owns the tile's look as `lf-answer` classes, which the React `AnswerTile` renders too. Games put the classes on their own buttons. The state icons are in the stylesheet as CSS masks of Phosphor's SVG files, so games import nothing. One look in one place; games depend on class names the linter cannot check.
2. **A tile builder in the game context.** `GameContext` gains `ui.answerTile()`, built by each host with `ui-kit`. Games never see the classes; more SDK surface, and every host (shell, sandbox, tests) must implement it.
3. **Each game styles its own tiles** from the tokens, as Hop Line does for its controls. No shared code; the look drifts between games.

## Decision

Option 1, as the team chose.

- `ui-kit` defines `lf-answer`: a column holding the tile, `lf-answer__tile` (the button), and the words under it, `lf-answer__state`. Modifiers on `lf-answer` set the content (`--number` in `play-number`, `--word` in `read-early`) and the state (`--selected`, `--correct`, `--try-again`, and `--ruled-out` for a tile a hint has crossed out: ADR 0019's disabled style, dashed and struck through). The words sit beside the button, not in it, so the tile's accessible name stays its answer.
- The check and loop-arrow icons come from `@phosphor-icons/core` (MIT, the same icons as `@phosphor-icons/react`, as SVG files), referenced from the stylesheet as masks. The build inlines the few it uses; nothing is fetched at runtime.
- The words come from the catalog: games pass them through `ctx.t()` like any other string.
- The React `AnswerTile` renders the same markup, so previews and app screens match the games.
- The game shell and the sandbox already load the `ui-kit` stylesheet, so every game in either host gets the classes. The create-game template uses them, and the game rules say to.

## Consequences

- A change to the tile's look reaches every game from one stylesheet.
- A renamed class silently unstyles games; the conformance suite's screenshots and the demo game's tests are the safety net.
- Revisit if games move off plain DOM (for example PixiJS scenes, which cannot use CSS classes), or if more shared pieces than tiles are needed, when a context builder (option 2) may pay for itself.
