# 0015. Item templates, generators, and what a line placement can say

- Status: accepted
- Date: 2026-10-21
- Plan section: 2.3 (learning core), 2.4 (content as code), 4.2 (misconceptions), 5.4 (re-grading), 6.4 (item types), 6.5 (parametric templates); the Hop Line brief

## Context

Hop Line (FRONTEND-KICKOFF step 8) is the first game whose items come from a parametric template: "constraints plus difficulty features produce endless fresh items… every generated item can be rebuilt from its seed" (plan 6.5). The plan keeps templates as content data in the repository (plan 2.4) but does not say where the code that turns a template into items lives. The approved brief also needs things a line placement could not express: where the frog starts, how many numbers are labelled, and which wrong landings point to which misconception.

## Options considered

Where the generators live:

1. **`learning-core`:** pure, seeded generators beside the graders.
2. **Each game's package:** the generator inside the game that first needs it.

## Decision

The team chose `learning-core`.

- **Templates are data.** `ItemTemplate` in `packages/contracts` is a union keyed by `generator`; the first is `number-line-addition`. Templates sit in the catalog (`itemTemplates`, today in `mock-data.json`) beside the misconceptions they point to (`misconceptions`), and `GET /api/catalog` serves both.
- **Generators are code in `learning-core`.** `generateItem(template, level, seed)` and `generateItems(template, levels, seed)` are pure and seeded, so the device and a future server make the same items, and the server can rebuild any item to re-grade it (plan 5.4). Items stay independent of games (plan 6.4).
- **An item's features decide it.** The ID names the features (`hop-line-addition-8-plus-5-every-5`), and difficulty b is the template's base plus a weight for each feature the item has (a sum above 10, many hops, crossing 10, landmark labels), so the same item always has the same ID and difficulty, whichever level drew it. A level only constrains which features are drawn.
- **No repeats.** A session's items are never repeated while a level has others to offer (plan 4.2).
- **Placeholder session shape.** Until the in-session policy chooses items (step 13), a session spreads its items evenly from the template's easiest level to its hardest (`rampLevels`).
- **Line placements gain three optional fields.** `start` (where the movement starts), `labelEvery` (1 labels every number; a larger gap leaves landmarks), and `misconceptions` (wrong positions, each pointing to one misconception). A right answer can never be a misconception, and a position two mistakes would both explain is left unmapped. The placement grader returns the misconception for such a landing, so the explanation can target it; the grade itself is unchanged.
- **Property tests.** `fast-check` (a development dependency of `learning-core`, as the stack already planned) checks over a thousand seeds per property that generated items are valid, fit their level, rebuild from their seed and their ID's features, grade right at the answer, and map only wrong landings.

## Consequences

- Each new template kind adds a member to the `ItemTemplate` union and a generator in `learning-core`, with its own tests.
- The mock data checks that templates and misconceptions name real skills and misconceptions. Activities whose template does not exist yet (the other slice games) are not checked until their templates arrive in step 14.
- Moving content to a separate `content` package later (plan 2.6) moves the data, not the generators.
