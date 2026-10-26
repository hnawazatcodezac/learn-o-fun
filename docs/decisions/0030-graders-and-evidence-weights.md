# 0030. Graders for the last four item types, and evidence weights

- Status: accepted
- Date: 2026-10-22
- Plan section: 4.1, 5.2, 5.3, 6.4; FRONTEND-KICKOFF step 11; `.claude/rules/learning-core.md`

## Context

Step 11 adds pure graders for match-sort, sequence, build-spell and program items, and plan 5.3's evidence weights, driven by config objects. The item contracts (step 4) already settle partial credit (a flag on each match-sort item), sequence scoring (positional or adjacency, per item) and accepted spellings (a list per item and locale). Three things were open: what a program does at a wall, how strictly a spelling must match, and whether a partly right answer counts towards mastery.

## Options considered

1. **Program at a wall or the edge:** the bump ends the run, and only finishing on the goal is right / the blocked move is skipped and the run carries on / reaching the goal at any point is right.
2. **Spelling:** exactly an accepted spelling, after Unicode normalisation / ignoring capitals.
3. **Partial credit and mastery:** only fully right answers count / evidence in proportion to the score.

## Decision

The first option each time, as the team chose, and these rules where plan 5.3 is silent.

**Graders.** Each returns `correct` and a `score` from 0 to 1; an answer of another type is wrong.

- **Match and sort:** right when the pairs, or the cards' buckets, are exactly the item's: none missing, none extra. With `partialCredit`, the score is the share of the item's pairs or placements given right; without, 0 or 1.
- **Sequence:** right in exactly the right order, every element once. The score is the share of elements in the right place (positional) or of neighbouring pairs in the right order (adjacency). An answer that leaves an element out, or names one twice, scores 0.
- **Build and spell:** the tiles' texts, joined in order, must equal one of the item's accepted spellings after Unicode normalisation (NFC). Capitals count. Each tile is used at most once, like a real tile; an unknown tile is wrong.
- **Program:** the robot starts on its cell, facing its way. `forward` moves one cell (north is up a row), and the turns turn it. A move into a wall or off the grid ends the run, wrong. The answer is right only if the robot ends on the goal, using only the item's allowed commands, within its instruction limit, counting each instruction once, a repeat and its body included. A program that would run more than a set number of steps (config) is wrong, so a run always ends.
- **Partial credit never counts towards mastery:** evidence reads `correct` only. The score shows in feedback and history.

**Evidence weights** (plan 5.3), in a typed config with the plan's values as defaults:

| Answer | Weight |
| --- | --- |
| First attempt, no help, item not seen in the last 14 days | 1.0 |
| First attempt after a hint or worked example | 0.5 if right, 1.0 if wrong |
| Second or later attempt on the same item | 0 (it earns learning credit) |
| Planned re-ask later in the session (role `re-ask`) | 0.3 |
| Item already presented in an earlier session within the last 14 days | 0.3 |
| Scaffold item (role `scaffold`) | its own weight toward its own skills; 0 toward the session's target skills |
| Skip | no observation |

When more than one applies, the smallest wins, so no combination can add evidence. Response time never counts. A repeat within one session is a planned re-ask, with its own weight, so "seen" means presented in an earlier session; resuming a session presents nothing again. `observations` in `learning-core` gives every answer's weight, and `skillEvidence` builds on it.

**Early signal** now counts full-weight observations: below 8 at weight 1.0 on at least 6 different items, the dashboard says "early signal", as the mastery gate in `.claude/rules/learning-core.md` reads. The counts parents see ("12 of 14 first tries right") stay as they are.

## Consequences

- Every item type the game library names can now be graded, on the device and again on the server, with the same code.
- Repeats and later attempts never raise the evidence: property tests prove it over many generated sessions.
- Step 12's learner model takes these weighted observations as its input; this step leaves the skill statuses as fixtures.
