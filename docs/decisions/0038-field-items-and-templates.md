# 0038. Field items and Tile Farm's templates

- Status: accepted
- Date: 2026-10-23
- Plan section: 6.4, 6.5; FRONTEND-KICKOFF step 14; the Tile Farm brief; builds on ADR 0015 and ADR 0037

## Context

The approved Tile Farm brief has the child plant rows of crops, every row the same length, then count the plants, a row at a time or one by one. Its two activities are equal groups and arrays. Like the café's, its items are `numeric`, and need a scene of their own: the rows asked for, their length, the crop, and whether the field's outline is drawn.

## Options considered

1. **The scene:** a `field` scene beside the ten-frame one, under `NumericItem.scene` / a new item type.
2. **The templates:** one shape for both activities, each its own generator / one generator with a flag.

## Decision

The first option each time, following ADR 0037.

- **`FieldScene`**, a second kind of `NumericItem.scene`: a `task` (`equal-groups`, where the farmer names the rows and their length, or `array`, where the field's outline is drawn), the rows and the row length, each from 1 to 10, and the crop's ID. The contract checks that the answer is a whole number, the rows times their length.
- **Two templates with one shape**, `field-equal-groups` and `field-array`. Each level names its rows, from and to, and the row lengths it uses, so rows of 2, 5 and 10 can sit in easier levels than rows of 3 and 4. An item's difficulty is the base, plus a little for each row and each ten plants, and more when the row length is not one of the template's easy lengths, 2, 5 and 10 in the mock catalog (the brief).
- **Times tables by row length.** The brief has arrays assess `multiply-by-2-5-10` only when the rows hold 2, 5 or 10. A template may name `timesTables`: row lengths, and the skills an item also assesses when its rows hold one of them. 3 rows of 5 is evidence for `arrays` and the times tables; 3 rows of 4 is evidence for `arrays` alone. This follows Hop Line's `skillIdsWithinTen` (ADR 0015), where a condition on the item decides its skills.
- **The brief's four misconceptions**, for 3 rows of 4: the rows and the length added, 7 (`adds-the-numbers`); one row, 4 (`counts-one-row`); the number of rows, 3 (`counts-the-rows`); a row short or extra, 8 or 16 (`skips-a-row`). As before, an answer two mistakes would both give is left out.

## Consequences

- The café and the farm share the numeric item, its grading and its misconceptions; each game draws only its own scene.
- Division and area, which the game serves later, can add their tasks to the field scene.
