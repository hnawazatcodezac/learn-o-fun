# Tile Farm: game brief

> **Status: approved** (2026-10-23), as drafted: a row per tap, counting by rows and by ones, both activities now, and the four misconceptions below, whose wording the learning designer confirms. It covers the farm's two activities for ages 6–8 (FRONTEND-KICKOFF step 14).
>
> **Build notes** (2026-10-23): the counter never stops at the plants in the field. Add a row and Add one go on past them, so the child, not the game, decides when the count is done, and a row gets its tick once the count reaches its running total. In arrays, planting stops when the outline is full; equal groups take up to 10 rows, so a row too many can be planted and dug up. Arrays assess `multiply-by-2-5-10` only when the rows hold 2, 5 or 10 (ADR 0038).

## Name and ages

**Tile Farm.** Over time the game serves ages 6–11 (`docs/game-library.md`). This brief covers ages 6–8 (the `early-primary` band) and the catalog's two farm activities, which share one mechanic:

| Activity                 | What the farmer asks for                                 | Skills                              | Plan    |
| ------------------------ | -------------------------------------------------------- | ----------------------------------- | ------- |
| `tile-farm-equal-groups` | "Plant 3 rows of 4 carrots. How many carrots?"           | `equal-groups`, `repeated-addition` | Free    |
| `tile-farm-arrays`       | "Fill the field: 3 rows and 5 columns. How many plants?" | `arrays`, `multiply-by-2-5-10`      | Premium |

Division and area, which the game serves later, come with their own activities.

## Target skills

- **Primary**, by activity: `equal-groups`, `arrays`.
- **Secondary:** `repeated-addition` in equal groups, and `multiply-by-2-5-10` in arrays when the rows hold 2, 5 or 10.

## Core mechanic

A farmer asks for crops planted in rows. The child taps **Plant a row**: each tap plants one whole row, every row the same length, so the field grows by equal groups. **Dig up a row** takes the last one away. When the field looks right, the child counts the plants on the farm's counter, starting at nothing: **Add a row** adds one row's worth and ticks that row as counted, and **Add one** and **Take one** count single plants. Then **Done** gives the count.

- **Equal groups:** the farmer names the rows and their length. The child plants 3 rows of 4, then counts 4, 8, 12.
- **Arrays:** the field's outline is drawn, 3 rows by 5 columns, and the child plants rows until it is full, then counts 5, 10, 15.

**Why the action is the concept.** Planting a row at a time makes the groups equal by construction, and counting a row at a time is repeated addition, the step from adding to multiplying. The field shows the array; the child, not the game, works out how many it holds.

## Item types and sources

- **Item type:** `numeric`, with a new `field` scene: the rows wanted, the row length, and for arrays the field's outline. The answer is the total. The build adds the scene to the contract and records it in an ADR, as the café did.
- **Sources:** two parametric templates, rebuilt from their seeds. Their difficulty comes from the number of rows, the row length (2, 5 and 10 are easier than 3 and 4), and the total.

## Support ladder

1. **First wrong answer: encouragement.** "Nearly! Count the rows again." The field and the count stay, to fix.
2. **Second wrong answer, or the hint button** (ADR 0013): **the game's hint.** Each row shows its running total at its end (4, 8, 12), dimmed until the child counts it.
3. **Third wrong answer: the worked "show me".** The farmer counts the field a row at a time, saying each total aloud: "4, 8, 12". Then the order appears as numbers: "4 + 4 + 4 = 12", or for arrays "3 rows of 5 = 15". The session moves on, and the item counts as supported.

## Misconceptions

Each is detected from the count given. The examples use 3 rows of 4, whose answer is 12.

| Answer                              | Misconception      | Explanation it triggers                                    |
| ----------------------------------- | ------------------ | ---------------------------------------------------------- |
| 7, the rows and the length added    | `adds-the-numbers` | "There are 3 rows, and each row has 4. Count every plant." |
| 4, one row                          | `counts-one-row`   | "That is one row. Count all 3 rows."                       |
| 3, the number of rows               | `counts-the-rows`  | "That is how many rows. How many plants are there?"        |
| 8 or 16, a row short or a row extra | `skips-a-row`      | "Count each row once: 4, 8, 12."                           |

As in the other games, an answer two mistakes would both explain is left out, and misconceptions only choose the explanation; they never change the grade.

## Practice and Challenge

|                          | Practice                                         | Challenge (arrays only)                                                                                                     |
| ------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Rows counted (the ticks) | Shown                                            | Shown                                                                                                                       |
| Add a row                | Yes                                              | No: the child counts single plants, or knows the fact                                                                       |
| Hint button              | Yes                                              | No                                                                                                                          |
| Attempts per item        | Up to three, with the support ladder above       | One                                                                                                                         |
| After a wrong answer     | Encouragement, a hint, then the worked "show me" | The field shows each row's total, without a lesson                                                                          |
| Timer                    | None                                             | None yet: `multiply-by-2-5-10` is a fluency skill, so a gentle timer may come from age 7, later, with the learning designer |

The equal-groups activity offers Practice only, as the catalog says.

## Accessibility

- **Keyboard:** Up arrow plants a row and Down digs one up; Right adds a row to the count, and + and − count single plants; Enter or Space gives the count. The field is one control whose value reads "3 rows of 4 planted. Counted: 8."
- **Switch:** Plant a row, Add a row and Done, with the rest reachable by scanning.
- **Touch:** buttons with the band's 48 px targets; the child never has to hit a single tile.
- **Not colour alone:** plants are a distinct shape, counted rows get a tick, and the field's outline is dashed.
- **Audio:** every order and count is spoken and shown as text. Until the shell's audio manager exists, the text is shown on its own.
- **Reduced motion:** rows appear without growing or swaying.

## Localization

- **Text:** every word is a catalog key, with ICU numbers and plurals.
- **Audio:** recorded voices for the orders, the counts and running totals, and the farm phrases.
- **Cultural variants:** crops any market knows (carrots, cabbages, sunflowers). Placeholder shapes stand in until the art is made.
- **Right to left:** the buttons and text follow the page's direction; rows fill from the start side, and the field mirrors, since an array has no reading direction of its own.

## Playtest success

With at least 5 children aged 6–8 (plan 6.7):

- Without adult help, children plant the rows and give a count within the first item.
- Asked "How did you count?", children say "4, 8, 12" or "3 fours", rather than counting from one.
- A child who plants too many rows digs one up rather than counting at random.
- Most children ask to play again.

## Questions for the review

1. **Plant a row per tap, or a plant per tap?** This brief proposes a row per tap, so the groups are equal by construction. A plant per tap is slower, and lets a child make unequal rows.
2. **Counting by rows.** Should the counter have "Add a row", so the child counts in rows (repeated addition), or only single plants? Arrays' Challenge leaves it out either way.
3. **The premium arrays activity.** Build both activities now, or equal groups first?
4. **Misconceptions.** Are these four, and their wording, the right ones? This is for the learning designer to confirm.
