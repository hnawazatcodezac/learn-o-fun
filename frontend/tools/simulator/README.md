# @learnofun/simulator

The learner simulator (plan 4.6, ADR 0031): thousands of synthetic children with a known true ability play sessions through the real session engine and policy, and the learner model in `@learnofun/learning-core` reads their events as the server would. Because the simulator knows each child's true ability, it can say whether the model's verdicts are right before any real child sees them.

Run it from `frontend/` with `npm run sim`. CI runs it after the unit tests.

## The synthetic children

`src/population.ts` draws 2,000 children from a seed, so every run is the same: a true starting ability from well below the skill's mastery difficulty to well above it, a learning rate, a chance of slipping on what they know and of guessing what they don't, forgetting between sessions, and a chance of skipping an item. The gates run over three populations of the same children (ADR 0034): learning fast (0 to 0.06 a practised item), slowly (0 to 0.02), and not at all, so a model tuned for one cannot hide its errors in another. Each plays 12 sessions, 2 days apart, shaped as for ages 6 to 8 (`src/simulate.ts`). The adaptive policy (ADR 0032) chooses every item, and the engine makes it on demand at the level asked; each session starts from the learner model's ability so far. The simulated skill's levels span every child's ability, so the gates measure the policy rather than the content's range.

## The release gates

`src/gates.ts` holds plan 4.6's gates. The report prints every one:

| Gate                                                                                                           | Target       | Now                                                         |
| -------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------- |
| False mastery: marked Mastered while the true chance at the mastery difficulty was under 0.85                  | under 5%     | required                                                    |
| Core-block targets whose true chance of success sat in plan 4.2's success zone (0.70–0.85, Practice, ages 6–8) | at least 70% | reported; its target is with a learning designer (ADR 0034) |
| Sessions with a scaffold loop: more than 3 scaffold items in a row, or over 30% of the session                 | under 2%     | required                                                    |
| Streaks of 3 first-try errors per session                                                                      | under 1      | required                                                    |

Every required gate must pass for each population. The success zone counts the core block's targets, the items the policy aims at it; warm-ups, scaffolds, bridges and the items to end on are easy on purpose (ADR 0033). No estimate of a child's ability can reach 70% from a first session (exact Bayes reaches 64.7% on the easiest children), so the target is with a learning designer and the gate is reported (ADR 0034). A gate is never loosened to pass: a failure is reported, and the policy's and model's defaults are tuned instead. The report also prints the share over every item, and the median items to mastery, to compare versions.

`npm test -w @learnofun/simulator` runs the simulator's own tests: the population and each child play out the same every time, an able child masters the skill and a struggling one never does, the adaptive policy chooses the items, the three populations differ only in how fast they learn, and a careless mastery gate is caught.
