# 0037. Ten-frame items and the café's templates

- Status: accepted
- Date: 2026-10-23
- Plan section: 6.4, 6.5; FRONTEND-KICKOFF step 14; the Ten Frame Café brief; builds on ADR 0015

## Context

The approved Ten Frame Café brief has the child fill ten-frame trays and answer with a number: how many were served, how many filled a tray, or a total once ten was made. Its items are `numeric`, but a numeric item has no scene: no trays, no fruit already in them, no parts to combine. A wrong number cannot point to a misconception either, as a wrong landing can in Hop Line. And the only item template is Hop Line's number-line addition.

## Options considered

1. **Where the scene lives:** an optional scene on the numeric item / a new item type for ten frames.
2. **Misconceptions for numbers:** on any numeric item, as wrong answers / only inside the ten-frame scene.

## Decision

The first option each time. The item type stays `numeric`, so the café's items are graded, weighted and stored like any other number (plan 6.4), and a scene only says what the game shows.

- **`TenFrameScene`** on `NumericItem.scene`: one or two trays of ten, the fruit already in each, the fruit's ID, and a `task`. The contract checks what each task implies, and that the answer is a whole number:
  - `fill-to`: the trays start empty, and the answer, the number served, fits in them;
  - `fill-up`: one tray, part full, and the answer is what fills it;
  - `make-ten`: two trays with fruit, the first not yet full, their parts making more than ten, and the answer is the total.
- **`NumericItem.misconceptions`**: wrong answers that point to a misconception, none if absent. As for line placement, a right answer is never one, each answer points to one, and they never change the grade.
- **Three templates**, each turning content data into seeded items (ADR 0015) with the brief's difficulty features, and each drawing its fruit from the template's list:
  - `ten-frame-fill-to` (counting): a little harder for each fruit asked for, and more above ten; one more or one fewer is `counts-one-twice`;
  - `ten-frame-fill-up` (bonds to 10): a little harder for each fruit missing, and more when many are missing; the part shown is `gives-the-part`, and 10 is `counts-all`;
  - `ten-frame-make-ten` (making ten): the two parts, harder when the first is far from ten or the total is above 15; 10 is `stops-at-ten`, and the total plus the fruit moved is `counts-moved-twice`.
- **The mock catalog's café content** sets each template's difficulties around its skill's mastery difficulty, so the policy can aim at the success zone, with levels from easy to hard. The making-ten activity also gives evidence for `add-within-20`, so adding within 20 can be mastered from two games, as its broad gate needs (the café brief).

## Consequences

- Any game that renders numbers can ignore the scene; a ten-frame game draws it.
- The generators in `learning-core` (step 14b) make items whose IDs name their features, so the server can rebuild and grade them again (ADR 0028).
- Another scene kind, such as a number bond diagram, joins `scene` as a discriminated union when a game needs it.
