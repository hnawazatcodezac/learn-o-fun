# @learnofun/game-tile-farm

**Tile Farm** (`BRIEF.md`, approved 2026-10-23): a farmer asks for crops planted in rows, and the child plants a whole row at a time, then counts the plants. It plays the farm's two activities for ages 6–8: equal groups and arrays (`tile-farm-equal-groups`, `tile-farm-arrays`). Its items are `numeric` with a `field` scene (ADR 0038).

- `src/manifest.ts`: what the game is and can do (plan 6.2), the misconceptions it explains and the crops it draws.
- `src/game.ts`: the `GameModule`. The field is drawn in SVG, a plot per plant, with placeholder crop shapes until the art is made.
  - **Controls:** Plant a row and Dig up a row; Add a row, Add one and Take one on the farm's counter, which starts at nothing; Done gives the count. On the field itself, Up plants a row, Down digs one up, Right adds a row to the count, + and − count single plants, and Enter or Space gives the count. Screen readers hear "3 rows of 4 planted. Counted: 8."
  - **Equal groups** names the rows and their length, up to 10 rows; a row too many can be planted and dug up. **Arrays** draw the field's dashed outline, and planting stops when it is full.
  - **Counting** never stops at the plants planted, so the child, not the game, decides when the count is done. A row gets its tick once the count reaches its running total.
  - **Practice:** a wrong answer leaves the field and the count as they were, with the explanation of the misconception it points to, or "Nearly! Count the rows again."
  - **Hint** (the shell's hint button, or the second wrong answer): each planted row shows its running total at its end, dimmed until it is counted.
  - **Worked "show me"** (the third wrong answer): the farmer plants the field and counts it a row at a time, saying each total, then the order appears as numbers: "4 + 4 + 4 = 12", or for arrays "3 rows of 5 = 15".
  - **Challenge** (arrays only in the catalog): no Add a row and no hints; after a wrong answer the field shows each row's total and the right count.
  - Rows fill from the start side, and the field mirrors in right-to-left text.
- `src/stories.ts`: one story per activity, copies of what the catalog's farm templates make, for the game sandbox and the conformance suite.
- `conformance/`: what the conformance suite needs (ADR 0014). `answer()` plants the rows with the arrow keys, counts single plants with + and −, and answers with Enter.
- `e2e/`: the brief's behaviour in the game sandbox (`npm run e2e -w @learnofun/game-tile-farm`).
- Interface text is under `games.tileFarm` in the English catalog. There is no audio yet; the voice lines in the brief arrive with the shell's audio manager.

Rules in `.claude/rules/games.md`.
