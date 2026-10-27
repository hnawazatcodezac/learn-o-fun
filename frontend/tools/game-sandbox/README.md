# @learnofun/game-sandbox

Plays any game with any of its stories or a single item, in any experience band, locale, theme and setting, with the real session runner and engine, and shows every learning event beside the game. Development only; never deployed. Plan section 6.8.

- `npm run dev:sandbox` (from `frontend/`) serves it on http://localhost:5176. The toolbar and the URL pick the game, age band, story, item, mode (Practice or Challenge), locale, theme, text size, font and reduced motion, for example `?game=hop-line&item=hop-line-addition-3-plus-6&mode=challenge&locale=en-XB`. The address bar always holds the setup on screen, so a link reproduces it. `?seed=` (URL only) changes the seed for event IDs and the game's `ctx.rng`.
- Changing anything the game receives starts a new session; the theme and font only restyle it. Restart, Pause, Resume, Hint, Skip item and End session drive the session as the game shell does; Hint works as the shell's hint button (ADR 0013).
- Live reload, on the development server: a change to a game's code, or to a package the sandbox and the games run on, reloads the page and starts the same setup again with the new code (`src/live-reload.ts`). Changes to React components and styles update in place.
- The event log lists each learning event in order; open one to see every field. Each event is checked against the contract in `packages/contracts`. The Problems list shows events that do not match it, message keys or signals the game's manifest does not declare, signal values of the wrong kind, and errors the game throws.
- The game gets silent audio and no assets yet; both arrive with the first game that needs them.
- `npm run e2e -w @learnofun/game-sandbox` plays the demo game through, checks pausing, skipping, ending, the pseudo-locales and URL setups, and runs WCAG 2.2 AA checks on the sandbox in both bands and three themes. It runs on the built sandbox, a Next.js static export (`npm run build`, then `npm run preview` on port 4176), as do the games' own suites (ADR 0041, ADR 0042).

A game appears here once it is in `@learnofun/game-registry`, which `npm run create-game` does. Its stories come from its package's `stories` export: one or more for every band it supports.
