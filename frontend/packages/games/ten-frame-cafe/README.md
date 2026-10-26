# @learnofun/game-ten-frame-cafe

**Ten Frame Café** (`BRIEF.md`, approved 2026-10-23): a customer asks for fruit, and the child fills ten-frame trays one fruit at a time, then serves. It plays the café's three activities for ages 6–8: counting to 20, number bonds to 10, and making ten to add (`ten-frame-cafe-count`, `ten-frame-cafe-bonds-to-10`, `ten-frame-cafe-make-ten`). Its items are `numeric` with a `ten-frame` scene (ADR 0037).

- `src/manifest.ts`: what the game is and can do (plan 6.2), the misconceptions it explains and the fruit it draws.
- `src/game.ts`: the `GameModule`. The trays are drawn in SVG, two rows of five cells each, with placeholder fruit shapes until the art is made.
  - **Controls:** Add, Take away and Serve buttons; in making ten, also Move one and Move back. On the trays themselves, Up or + adds, Down or − takes away, Right and Left move fruit between the trays, and Enter or Space serves. Screen readers hear "First tray 8 of 10, second tray 5. Altogether 8."
  - **Counting** fills the trays to the number asked for, a second tray above ten.
  - **Bonds to 10** fills a part-full tray. Fruit added past a full tray spill onto the counter beside it, to take away, so serving the part shown, or a whole tray, is possible and its misconception can be explained (approved during the build, 2026-10-23).
  - **Making ten** moves fruit from the second tray to fill the first, then counts on from the full tray with Add and Take away: "Altogether: 13". Serving ten forgets the second tray; counting the moved fruit again gives the other mistake.
  - **Practice:** each tray says how many it holds; a wrong answer leaves the trays as they were, with the explanation of the misconception it points to, or "Count the fruit again".
  - **Hint** (the shell's hint button, or the second wrong answer): the empty cells are outlined, and the message says how many more fill the tray.
  - **Worked "show me"** (the third wrong answer): the trays fill one fruit at a time, counting aloud, then the order appears as numbers.
  - **Challenge:** no tray counts and no hints; after a wrong answer the trays show the right order.
  - The trays fill left to right in every locale (the brief's open question for right-to-left classrooms).
- `src/stories.ts`: one story per activity, copies of what the catalog's café templates make, for the game sandbox and the conformance suite.
- `conformance/`: what the conformance suite needs (ADR 0014). `answer()` adds fruit with the arrow keys and serves with Enter.
- `e2e/`: the brief's behaviour in the game sandbox (`npm run e2e -w @learnofun/game-ten-frame-cafe`).
- Interface text is under `games.tenFrameCafe` in the English catalog. There is no audio yet; the voice lines in the brief arrive with the shell's audio manager.

Rules in `.claude/rules/games.md`.
