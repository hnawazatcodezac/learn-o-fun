# Ten Frame Café: game brief

> **Status: approved** (2026-10-23), as drafted: Add and Take away taps, ages 6–8 first, the making-ten activity also giving evidence for `add-within-20`, and the five misconceptions below, whose wording the learning designer confirms. It covers the café's three activities for ages 6–8 (FRONTEND-KICKOFF step 14).
>
> **Build notes** (2026-10-23): in bonds to 10, fruit added past a full tray spill onto the counter beside it, to take away, so the two misconceptions can be served and explained (approved); a tray that stopped at ten could not show them. In making ten, the child counts on from the full tray with Add and Take away ("Altogether: 13"), since the game must not work out the total itself.

## Name and ages

**Ten Frame Café.** Over time the game serves ages 4–8 (`docs/game-library.md`). This brief covers ages 6–8 (the `early-primary` band) and the catalog's three café activities, which share one mechanic and differ only in content:

| Activity                     | What the customer asks for                | Skills                                                                           |
| ---------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------- |
| `ten-frame-cafe-count`       | "13 strawberries, please."                | `count-to-20`                                                                    |
| `ten-frame-cafe-bonds-to-10` | "Fill the tray. It has 6 lemons already." | `number-bonds-to-10`                                                             |
| `ten-frame-cafe-make-ten`    | "8 pears and 5 pears, in one box."        | `make-ten-to-add`, `number-bonds-to-20`, and `add-within-20` (see the questions) |

Ages 4–5 come later, with their own activities, 64 px targets and audio-first instructions. The manifest declares only `early-primary` until then.

## Target skills

- **Primary**, by activity: `count-to-20`, `number-bonds-to-10`, `make-ten-to-add`.
- **Secondary:** `number-bonds-to-20` in the make-ten activity, and `add-within-20`, so that adding within 20 earns evidence from two different games, as its mastery gate needs (it is a broad skill, plan 4.1). Today only Hop Line gives that evidence, so no child can reach Mastered on it.

## Core mechanic

A customer comes to the counter and asks for fruit. The child fills **ten-frame trays**, two rows of five cells, by tapping **Add**: each tap puts one fruit in the next empty cell, top row first, left to right. **Take away** removes the last one. Numbers above 10 use a second tray. When the order looks right, the child taps **Serve**.

- **Counting:** the child adds fruit until there are 13: one full tray and 3 more.
- **Bonds to 10:** the tray arrives with 6 lemons. The child adds until it is full, and the answer is how many were added: 4.
- **Making ten:** one tray holds 8 pears, the other 5. The child moves pears from the second tray into the first, one tap each, until the first is full. Then they count what is in both trays together: 10 and 3, which is 13.

**Why the action is the concept.** The ten frame makes 5 and 10 visible at a glance, so the child sees "a full tray and 3 more" rather than counting from one. In making ten, moving 2 pears across is exactly the step "8 + 5 = 8 + 2 + 3", done with the hands before it is written.

## Item types and sources

- **Item type:** `numeric`. The answer is a whole number: the fruit served, the fruit added, or the total. The tolerance is 0.
- **Sources:** three parametric templates (plan 6.5), each rebuilt from its seed. Their difficulty comes from these features:
  - counting: the number (within 10, or 11 to 20), and whether the fruit is placed in order or scattered first;
  - bonds to 10: the number already in the tray;
  - making ten: the first number (how far from 10), and whether the total crosses 15.
- **Contract gap:** a `numeric` item has no scene today: no trays, no fruit already placed, no parts to combine. The build adds a small `ten-frame` representation to the numeric item, as Hop Line added a starting number to `placement`, and records it in an ADR.

## Support ladder

1. **First wrong answer: encouragement.** "Nearly! Count the fruit again." The trays stay as the child left them, to fix.
2. **Second wrong answer, or the hint button** (ADR 0013): **the game's hint.** The empty cells show faint outlines and the tray says how many it holds ("6 of 10"). In making ten, the cells still to fill in the first tray glow: "2 more fills the tray".
3. **Third wrong answer: the worked "show me".** The café worker fills the trays one fruit at a time, saying each count aloud. Then the order appears as numbers: "6 + 4 = 10", or "8 + 2 = 10, and 3 more is 13". The session moves on, and the item counts as supported.

## Misconceptions

Each is detected from the number served. The make-ten examples use 8 + 5, whose answer is 13.

| Answer                                      | Misconception                                                       | Explanation it triggers                        |
| ------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------- |
| One more or one fewer than asked (counting) | `counts-one-twice`: counts a fruit twice, or skips one              | "Touch each fruit once as you count."          |
| The number already there, 6 (bonds)         | `gives-the-part`: answers with the part shown, not the part missing | "The tray has 6. How many more make 10?"       |
| 10 (bonds)                                  | `counts-all`: counts the whole tray, not the fruit added            | "Count only the lemons you added."             |
| 10 (making ten)                             | `stops-at-ten`: forgets what is left in the second tray             | "One tray is full. What is left in the other?" |
| 15 (making ten)                             | `counts-moved-twice`: counts the moved pears in both trays          | "Those 2 pears moved. Count them once."        |

As in Hop Line, when two would give the same answer the template leaves it unmapped, and misconceptions only choose the explanation; they never change the grade.

## Practice and Challenge

|                        | Practice                                         | Challenge                                                                                                                                                      |
| ---------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tray count ("6 of 10") | Shown                                            | Hidden: the child counts                                                                                                                                       |
| Hint button            | Yes                                              | No                                                                                                                                                             |
| Attempts per item      | Up to three, with the support ladder above       | One                                                                                                                                                            |
| After a wrong answer   | Encouragement, a hint, then the worked "show me" | The trays show the right order, without a lesson                                                                                                               |
| Timer                  | None                                             | None for counting and making ten. `number-bonds-to-10` is a fluency skill, so a gentle timer may come from age 7 (plan 4.2), later, with the learning designer |

The counting activity offers Practice only, as the catalog says.

## Accessibility

- **Keyboard:** Up arrow or + adds a fruit, Down arrow or − takes one away, and Enter or Space serves. In making ten, Left and Right choose the tray to take from and put into. The trays are one control whose value reads "First tray 8 of 10, second tray 5", so a screen reader follows every move.
- **Switch:** Add, Take away and Serve, with the tray choice reachable by scanning.
- **Touch:** Add, Take away and Serve buttons with the band's 48 px targets. The child never has to hit a single cell, so the trays can be small on a phone.
- **Not colour alone:** fruit are distinct shapes, the full tray gets a border, and the cells still to fill have dashed outlines.
- **Audio:** every order is spoken and shown as text. Until the shell's audio manager exists, the text is shown on its own.
- **Reduced motion:** fruit appear in their cell, without sliding or bouncing.

## Localization

- **Text:** every word is a catalog key, with ICU numbers and plurals ("{count, plural, one {# strawberry} other {# strawberries}}"). Numbers are formatted with `Intl`.
- **Audio:** recorded voices for the orders, the counts 1 to 20 and the café phrases, in each learning language.
- **Cultural variants:** fruit any market knows (apples, pears, lemons, strawberries). Placeholder shapes stand in until the art is made.
- **Right to left:** the buttons and text follow the page's direction. Whether the tray fills from the right in right-to-left classrooms is an open question before such a launch; until then it fills left to right, as the ten frame is usually taught.

## Playtest success

With at least 5 children aged 6–8 (plan 6.7):

- Without adult help, children fill a tray and serve within the first item.
- Asked "How many are there?", children say "10 and 3" or "a full tray and 3", rather than counting from one.
- In making ten, children move pears into the first tray before counting, and some say "8 and 2 make 10".
- A child who overfills uses Take away rather than serving at random.
- Most children ask to play again.

## Questions for the review

1. **Tap to add, or drag each fruit?** This brief proposes Add and Take away buttons, one fruit per tap. Dragging feels more physical but is harder for switch users and on small phones.
2. **Ages 6–8 first?** Ages 4–5 need audio-first instructions and 64 px targets; this brief leaves them for later.
3. **The two-game skill.** Should the making-ten activity also give evidence for `add-within-20`? Then adding within 20 can be mastered from Hop Line and the café together. The catalog's activity lists only making ten and bonds to 20 today.
4. **Misconceptions.** Are these five, and their wording, the right ones? This is for the learning designer to confirm.
