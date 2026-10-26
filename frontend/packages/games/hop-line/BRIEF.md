# Hop Line: game brief

> **Status: approved** (2026-10-21), as drafted: hop by hop, landmark-only labels as a harder step, and the four misconceptions below. It covers the first activity, "Hop Line: add within 20". Later activities reuse the same mechanic with new content (subtraction, bigger numbers, fractions, decimals, negative numbers; `docs/game-library.md`), and each gets its own section here when it is built.

## Name and ages

**Hop Line.** Over time the game serves ages 5–14. This brief covers ages 6–8 (the `early-primary` band) and one activity, `hop-line-add-within-20`. The manifest declares only `early-primary` until there are activities for other bands.

## Target skills

- **Primary:** `add-within-20` (add within 20 by counting on).
- **Secondary:** `add-within-10`, its prerequisite. Items whose sum is 10 or less give evidence for it, and the session engine can use them as scaffold items.
- Items that cross 10 prepare for `make-ten-to-add`, but claim no evidence for it.

## Core mechanic

A frog sits on a number line from 0 to 20, on the first number of the sum. The child moves the frog **one hop at a time**, and each hop is exactly one number. When the frog has made the right number of hops, the child taps **Land**. For 3 + 4, the frog starts on 3, makes 4 hops and lands on 7. A **Back** hop undoes a hop, so a child can fix a miscount before landing.

**Why the action is the concept.** Adding is moving forward along the number line, and counting on is counting hops from the first number. The second number becomes a distance the frog travels, not a fact to recall. The answer is the place where the frog lands; the child never types it or picks it from a list.

## Item types and sources

- **Item type:** `placement` on a line from 0 to 20. Answers are whole numbers, so the tolerance is 0.
- **Source:** the parametric template `hop-line-addition` (plan 6.5). Every item can be rebuilt from its seed, and its difficulty comes from these features:
  - the sum is within 10, or within 20;
  - the hops cross 10, or not;
  - the number of hops is small (1–3) or large (4–9);
  - the line labels every number, or only 0, 5, 10, 15 and 20. The second is harder, because the child counts the ticks between landmarks.
- **Contract gap:** today a line placement has a target, but no starting number and no label setting, and a wrong position cannot point to a misconception. The build needs small additions to the `placement` contract. They will be recorded in an ADR during the build.

## Support ladder

Plan 4.2 sets the order; this is what Hop Line shows at each rung.

1. **First wrong answer: encouragement.** "Nearly! Count the hops again." The frog hops back to the start, and the child tries again.
2. **Second wrong answer, or the hint button** (once per item, ADR 0013): **the game's hint.** Footprints appear for the hops still to make (○ ○ ○ ○) and fill in one per hop, so the child can see when there have been enough hops. On a line labelled only at the landmarks, the hint also labels every number.
3. **Third wrong answer: the worked "show me".** The frog goes back to the start and makes the hops itself, one at a time, and each landing number is said aloud: "4, 5, 6, 7". Then the sum appears: 3 + 4 = 7. The session moves on, and the item counts as supported.

## Misconceptions

Each one is detected from where the frog lands. The examples use 3 + 4, whose answer is 7.

| Lands on              | Misconception                                                                      | Explanation it triggers                              |
| --------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 6, one short          | `counts-the-start`: counts the number the frog is sitting on as the first hop      | "The frog starts on 3. Its first hop takes it to 4." |
| 8, one past           | `extra-hop`: counts one hop twice, or makes one hop too many                       | "Count each hop once: 1, 2, 3, 4."                   |
| 4, the number of hops | `goes-to-the-number`: hops to the second number instead of hopping that many times | "Hop 4 times from 3. Don't hop to 4."                |
| Below 3               | `hops-backwards`: moves towards the smaller numbers                                | "Adding takes the frog forward, to bigger numbers."  |

- **Overlaps:** when two misconceptions would put the frog on the same number, as in 3 + 1, where "one short" is the start itself, the template leaves that number unmapped rather than guess.
- **Grading:** misconceptions only choose the explanation (plan 4.2). They never change the grade.

## Practice and Challenge

|                        | Practice                                         | Challenge                                                 |
| ---------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| Hop counter ("2 hops") | Shown                                            | Hidden: the child keeps count                             |
| Hint button            | Yes                                              | No                                                        |
| Attempts per item      | Up to three, with the support ladder above       | One                                                       |
| After a wrong answer   | Encouragement, a hint, then the worked "show me" | The frog shows the right landing number, without a lesson |
| Evidence weight        | As set in plan 5.3                               | Full weight for every answer                              |
| Timer and lives        | None                                             | None: `add-within-20` is not a fluency skill (plan 4.2)   |

## Accessibility

- **Keyboard:** Right arrow hops forward, Left arrow hops back, and Enter or Space lands. Home sends the frog back to the start. The line is one control whose value reads "Frog on 5, 2 hops", so a screen reader follows every hop. The manifest declares full screen-reader support.
- **Switch:** the same actions on two switches, Hop and Land, with Back reachable by scanning.
- **Touch:** Hop, Back and Land buttons, or tap the frog to hop. The child never has to tap a single number on the line, so the line can be small on a phone (360×640) while the buttons keep the band's 48 px targets.
- **Not colour alone:** the frog is a distinct shape. The start and landing numbers carry an outline and bold text. Hops are drawn as numbered arcs. Footprints change from outlined to filled.
- **Audio:** every instruction is spoken and shown as text: "Start on 3. Hop 4 times. Where does the frog land?" The voice lines are recorded assets. Until the shell's audio manager exists, the text is shown on its own.
- **Reduced motion:** a hop moves the frog straight to the next number and draws the arc, with no bounce.

## Localization

- **Text:** every word is a catalog key, with ICU numbers (`{start, number}`). The line's labels are formatted with `Intl`, so numbers follow the locale's numbering system.
- **Audio:** recorded voices for the core phrases (start, hop, land, well done) and for the numbers 0 to 20 that the "show me" says aloud, in each learning language (plan 7.3).
- **Cultural variants:** none needed; a frog in a pond suits every market. Placeholder shapes stand in until the art is made.
- **Right to left:** the buttons and text follow the page's direction, but the number line does not mirror: 0 stays on the left (plan 7.2). Which way Gulf classrooms draw number lines is an open question before that launch.

## Playtest success

With at least 5 children aged 6–8 (plan 6.7):

- Without adult help, children start, hop and land within the first item, and finish a session of six items.
- Asked "How did you get 7?", children say something like "I started on 3 and hopped 4": counting on, not guessing.
- A child who miscounts uses Back or the footprints to fix it, rather than tapping Land at random.
- After the first item, no child is confused about which way to hop.
- Most children ask to play again.

## Questions for the review

1. **Hop by hop, or straight to the answer?** This brief proposes hop by hop, which makes counting on the action itself. The alternative is tapping the landing number directly, which tests recall but needs 21 numbers small enough to tap on a phone.
2. **Landmark labels.** Is a line labelled only at 0, 5, 10, 15 and 20 a fair harder step for 6- and 7-year-olds?
3. **Misconceptions.** Are these four, and their wording, the right ones? This is for the learning designer to confirm.
