# 0031. The learner model, the mastery gate and the simulator

- Status: accepted; the policy gates amended by ADR 0033; the update, the gate's predicted success and the simulator's populations amended by ADR 0034
- Date: 2026-10-22
- Plan section: 4.1, 4.2, 4.6, 5.3; FRONTEND-KICKOFF steps 12 and 13; `.claude/rules/learning-core.md`; builds on ADR 0028 and ADR 0030

## Context

Step 12 builds plan 4.1's learner model (an Elo-style ability with uncertainty), the mastery gate and the review ladder, and `tools/simulator`, whose synthetic learners check plan 4.6's release gates in CI. Three things were open. Three of the four gates (success zone, scaffold loops, error streaks) measure the in-session policy, which step 13 builds, yet step 12's "Done when" asked for every gate. Plan 4.1 defines Mastered but not the statuses before it. And ADR 0028 left the dashboard's statuses as fixtures until the learner model existed.

## Options considered

1. **Gates:** step 12 requires the learner-model gate and the golden scenarios, and reports the policy gates until step 13 requires them / every gate in step 12, with a difficulty-choosing policy built early.
2. **Statuses before Mastered:** by predicted success at the skill's mastery difficulty / by counts of evidence.
3. **The dashboard's statuses:** computed from the events, the scripts adjusted to keep the intended ones / computed as they fall / fixtures until step 13.

## Decision

The first option each time, as the team chose.

**The model** (plan 4.1), every number a starting default in a typed config, for a learning designer to tune with real data:

- Success: P = c + (1 − c) / (1 + e^−(θ − b)), with the item's difficulty b and its guessing floor c: one over the number of options for single choice and audio choice, 0 for the rest.
- Update, for each observation of weight w (ADR 0030) with x = 1 if right: θ′ = θ + K(σ) · w · (x − P), where K(σ) = 0.8 · σ, so early evidence moves the estimate more. Then σ′ = max(0.15, σ · (1 − 0.08 · w)). A skill starts at θ = 0 and σ = 1. An observation of weight 0 changes nothing. ADR 0034 replaces this with K from the information each answer carries (`elo-2`).
- **Mastered** needs all of plan 4.1's gate: predicted success at the skill's mastery difficulty of at least 0.85 (with no guessing floor; on θ − σ since ADR 0034) and σ under the skill's threshold; at least 8 full-weight observations on 6 different items; evidence from 2 sessions on 2 different days; at least 4 right of the 5 latest full-weight observations; for a broad skill, evidence from 2 different activities.
- **Before Mastered**, by that same predicted success: Not started with no observations; Exploring below 0.5, or while the evidence is an early signal; Building from 0.5; Strong from 0.7 but short of the full gate.
- **Review** (plan 4.1): once mastered, a skill is due for review after 3, then 7, 21 and 60 days. Its first full-weight answer after the date is the review: right moves it a rung up the ladder; wrong sets Review due and lowers θ by 0.3, never back to Not started, and it stays Review due until a right review. A skill past its date with no review is Review due too.
- The state is a projection of the events, rebuilt the same every time (CLAUDE.md rule 3), with the time now passed in.

**The simulator** (`tools/simulator`, `npm run sim`, in CI): seeded synthetic learners with a true ability per skill, a learning rate, slip, guess, forgetting between sessions and a chance of skipping. They play sessions through the real engine and policy, and the learner model reads the events as the server would. It reports:

- **false mastery** (required from step 12): of the skills it marks Mastered, the share whose true chance at the mastery difficulty was under 0.85 at that moment. Under 5%.
- **the policy gates** (reported from step 12, required from step 13): items in the success zone, judged on the learner's true chance of success; sessions with a scaffold loop; streaks of 3 first-try errors per session. ADR 0033 counts the core block's targets for the success zone and leaves it reported, failing, until step 13b.
- items to mastery, to compare versions.

A gate is never loosened to pass. A failure is reported, and the model's defaults are tuned instead.

**Golden scenarios** in `learning-core` pin the exact ability, uncertainty, status and reason codes for hand-written sequences, such as "three wrong, then four right".

**The dashboard's statuses are computed.** The mock API works out every skill state from the events with this model; the fixture statuses go (ADR 0028), and the past-session scripts are adjusted so each child keeps the statuses the mock data meant. Review dates come from the model too, so Today's "mastered it on" date agrees with it. Statuses move with the real date, as they should: a mastered skill falls due for review when its interval passes.

## Consequences

- Mastery comes only from evidence, through one gate in one package (CLAUDE.md rule 9).
- Step 13's "Done when" takes on the three policy gates.
- The model's defaults are guesses until a learning designer and real data tune them; the simulator says what each change does before any child sees it.
