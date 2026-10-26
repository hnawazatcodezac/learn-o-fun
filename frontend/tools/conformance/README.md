# @learnofun/conformance

The conformance suite every game must pass (plan 6.7, 6.8; ADR 0014). It covers every game in `@learnofun/game-registry` and each of its stories, with no per-game test code beyond the game's keyboard driver.

Run it from `frontend/` with `npm run conformance`. CI runs it as part of `npm test` and `npm run e2e`. The browser checks run on the web app's test build and the built sandbox (ADR 0041).

**Without a browser** (`npm test -w @learnofun/conformance`):

- the manifest is valid and carries the game's ID;
- there is a story for every band the game supports, and the stories hold valid items of types the game renders;
- every message key in the manifest is in the English catalog;
- the game has a keyboard driver, and every registered game has a conformance entry;
- the bundle stays within 1,500,000 bytes: the game's own JavaScript, CSS, images and fonts, built and minified as a library, without the shared runtime (`@learnofun/*`, `zod`, React) or audio.

**In the game shell** (`/play/dev/:gameId` in the web app), playing with the game's keyboard driver:

- a full session ends in a celebration, with learning events that match the contracts and form one well-ordered session (`src/lifecycle.ts`), and the game removes itself afterwards;
- a wrong answer gets another try, and a hint the child asks for still lets the child answer (Practice);
- Challenge mode takes one answer per item and shows no hints;
- input is ignored while the session is paused, and taken again after it resumes;
- nothing overflows at 1024×600, 768×1024 or 360×640 (ADR 0012), in English and in long pseudo-text, on every item;
- the game survives a rotation in the middle of an item, and works right to left;
- en-XA shows no hard-coded text, keyboard focus is visible, and the screen meets WCAG 2.2 AA;
- nothing logs a page error or console error.

**In the game sandbox:** a full session leaves the Problems list empty (no undeclared message keys or signals, no invalid events, no errors), and under reduced motion nothing in the game animates.

It starts its own web app and sandbox servers on ports 5183 and 5186, so it can run beside their tests.

**Not automated:** loading in under 3 seconds on a mid-range tablet and holding 60 fps (plan 6.7). Check those by hand for each game.

## A game's part

Each game package exports `./conformance` (`conformance/index.ts`): its manifest, its stories, and `answer(stage, item, correct)` in `conformance/driver.ts`, which answers the item on screen, right or wrong, using only the keyboard. `npm run create-game` scaffolds both and adds the game to `src/games.ts`. When a game's controls change, change its driver with them.
