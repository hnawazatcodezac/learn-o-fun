# @learnofun/learning-core

The adaptive-learning engine: item graders, evidence weights, the learner model and mastery gate, the in-session policy, the planner and the explanation builder. Runs identically in the browser and on a server. Plan sections 2.3, 4 and 5; rules in `.claude/rules/learning-core.md`.

Pure: no I/O, timers, browser or Node APIs, `Date.now()` or `Math.random()`. The clock and the seeded random source are always passed in, so the same inputs always give the same decisions. May import only `@learnofun/contracts`.

## What is here

- `random.ts`: a seeded random source (`seedRandom`, `nextRandom`, `createRandom`) and `deriveSeed` for separate streams.
- `ids.ts`: `uuidv7(time, random)`, so device-made IDs repeat exactly in a replay.
- `graders.ts`: `grade(item, response)` for all eight item types (ADR 0030): choice, audio choice, numeric, placement, match and sort (with partial credit), sequence (positional or adjacency), build and spell (accepted spellings), and program (run in a small simulator).
- `templates.ts`: seeded item generators (ADR 0015), and `itemFromId`, which rebuilds a template item from its ID so an answer can be graded again (ADR 0028).
- `plan.ts`: session plans by band, with warm-ups and easy items to end on (ADR 0022), and `activeMs` for session minutes and the daily limit.
- `policy.ts`: the `SessionPolicy` interface and the placeholder policy (`placeholder-2`): items in order; after a wrong answer encouragement and a retry, then a hint, then a worked "show me"; one attempt in Challenge. Every decision carries a reason code.
- `adaptive-policy.ts`: plan 4.2's in-session policy (`adaptive-1`, ADR 0032) behind the same interface: easy warm-ups and endings, the core block aimed at the success zone, difficulty changed on windows, scaffold and bridge, one re-ask of a missed item, loop guards and an offered break. A fixed list it plays as the placeholder does.
- `session.ts`: `createSessionEngine(policy, { maker })`, a pure state machine. Each call takes the state and the time and returns the new state, the learning events to record, and what the game should do next. With an `ItemMaker` (`templateMaker` in `templates.ts`), it makes each item at the level the policy asks; it keeps the finished items and the child's ability within the session for the policy.
- `evidence.ts`: plan 5.3's evidence weights (`answerWeight`, `observations`) and each skill's evidence (`skillEvidence`), with "early signal" below 8 full-weight observations on 6 items (ADR 0028, ADR 0030).
- `measures.ts`: plan 5.2's session measures (`sessionMeasures`), for session history (ADR 0029).
- `learner-model.ts`: plan 4.1's learner model (`elo-2`, ADR 0031, ADR 0034): the Elo-style ability with an uncertainty that shrinks by what each answer shows and widens with practice and days away (`skillState`, `updateAbility`, `abilityAfter`, `successChance`), the mastery gate judged on θ − σ, the statuses before it, and the review ladder of 3, 7, 21 and 60 days.
- `planner.ts`: plan 4.3's planner for Today (`planToday`, `planner-1`, ADR 0035): candidates from reviews due, skills being built, frontier skills and prerequisites of skills that stayed hard, scored with goals, the subject balance, variety, recency and favourites, then a review card, a new card and "Your choice", each its own playable activity, with their reasons.

Every threshold and weight is in a typed config with defaults. `tools/simulator` checks the model against synthetic learners (`npm run sim`).
