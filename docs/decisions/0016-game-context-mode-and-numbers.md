# 0016. A game knows its mode, and formats its numbers through the platform

- Status: accepted
- Date: 2026-10-21
- Plan section: 4.2 (Practice and Challenge), 6.2 (the contract), 7.1 (numbers with `Intl`); the Hop Line brief

## Context

The game brief template asks what changes between Practice and Challenge, and Hop Line's brief hides its hop counter in Challenge. A game had no way to know which mode its session is in. The brief also says the number line's labels follow the locale's numbering system, but a game could only write numbers into sentences through `ctx.t` with ICU, not on their own, as labels in a scene.

## Options considered

1. Add the mode and a number formatter to `GameContext`.
2. Give games the locale and let each format numbers itself.
3. Pass the mode with each item, and write lone numbers through a catalog message such as `{value, number}`.

## Decision

Option 1. `GameContext` gains:

- `mode`: Practice or Challenge, from the session setup. A game uses it only to change what it shows, as its brief says; the session engine still decides attempts and support.
- `formatNumber(value)`: a number written for the scene in the child's locale and numbering system. The game shell and the sandbox provide it from the i18n formatters; numbers inside sentences still go through `t` with ICU.

The runner passes both through. Games still never see the locale itself, so they cannot branch on it.

## Consequences

- A number on a game's scene reads correctly when a market uses another numbering system, with nothing to change in the game.
- Option 3 would have pseudo-localized lone numbers, padding every label in the long-text check.
- Every place that starts a session (the shell, the sandbox and tests) passes a number formatter.
