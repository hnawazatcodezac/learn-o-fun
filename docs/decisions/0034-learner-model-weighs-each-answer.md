# 0034. The learner model weighs what each answer shows, and the gates run over three kinds of child

- Status: accepted
- Date: 2026-10-23
- Plan section: 4.1, 4.2, 4.6; FRONTEND-KICKOFF step 13b; amends ADR 0031 and ADR 0033

## Context

ADR 0033 left the success-zone gate failing, at 31.0% of the core block's targets against 70%, and gave step 13b the job of rebuilding the learner model. The simulator was used to find what limits the gate and what a better model can do:

- **The policy's rules are sound.** Given each child's true ability, plan 4.2's rules put 90% of targets in the zone. What falls short is the estimate of the ability.
- **No estimate can reach 70% from a first session.** Exact Bayes, the best estimate there is, on children who never learn, slip or guess, reaches 64.7% of targets over 12 sessions: 26% in the first, 70% by the seventh, 82% in the twelfth. Every child starts from the same guess, and each answer shows only a little. Children who learn, slip and guess make it harder still.
- **The old model grew sure too fast.** Its uncertainty shrank a fixed 8% with every answer, whatever the answer showed, so after about 20 answers it barely moved and fell behind children who were learning.
- **False mastery passed only because most simulated children learn fast.** For children who do not learn, the old model reached 5.7%. A gate checked after every answer, on the estimate alone, lets a child just short of mastery cross by chance.
- **Expected learning invents mastery.** A fixed gain per answer helped fast learners, but gave children who do not learn 9% to 26% false mastery. Learning each child's own rate either changed nothing, when its prior was narrow, or kept σ above every threshold, when it was wide, so no one reached Mastered.

## Options considered

1. **The zone's target:** send it to a learning designer with this evidence / set 50% now and require it / keep 70%, reported.
2. **The model:** uncertainty from what each answer shows, with expected learning / the same without expected learning / today's model. Once expected learning proved unsafe: the same with a cautious mastery gate / the same with per-child growth kept, switched off / today's model.
3. **Who the gates run over:** fast, slow and non-learning children / the default population only.

## Decision

The recommended option each time, as the team chose.

**The model, `elo-2`** (plan 4.1's form, every number a starting default in `LearnerConfig`):

- Before each answer of weight w > 0, σ² grows by 0.0005, since a child changes as they practise; it grows by 0.001 for each day between answers, and up to now when a state is read.
- Then θ′ = θ + K · w · (L/P) · (x − P), where L is the logistic chance of knowing, P = c + (1 − c)·L with the guessing floor c, and K = σ′² = σ² / (1 + σ² · I), the variance left once the answer is read, with I = w · (1 − c) · L · (1 − L) · L/P the information the answer carries. With no guessing floor, L/P is 1 and this is θ′ = θ + K(σ) · w · (x − P), with K shrinking as σ shrinks. An answer the model was sure of moves it little; a surprising one more.
- A skill starts at θ = 0 and σ = 1.5. σ never rises above 1.5 nor falls below 0.15. An observation of weight 0 changes nothing. No expected learning: the model follows a child's learning through the answers and the widening σ.
- **Mastered** needs predicted success of at least 0.85 at the mastery difficulty on a cautious ability, θ − σ, and every other part of plan 4.1's gate, unchanged. This makes the gate stricter, never looser.

**The gates run over three kinds of child**: the same 2,000 children learning fast (0 to 0.06 a practised item), slowly (0 to 0.02) or not at all. Every required gate must pass for each of them.

**The success zone's target goes to a learning designer.** The 70% stays written and the gate stays reported. This ADR's evidence is what they set a reachable target from, for example the share of targets in the zone once a child has a few sessions of evidence, or a share of the exact-Bayes bound. Step 13c does not wait for it.

**The mock scripts give each mastered skill the evidence of several sessions.** Groups can sit `aboveMastery` the skill's mastery difficulty, as the policy serves a child doing well. Robin's and Nia's mastered skills now come from sessions of 18 items, 1.5 above it, with four of every five right first time. The new sessions come last in the list, so the existing ones keep their IDs. Robin now has 21 sessions and Nia 8, and every child keeps the statuses and review dates the data means.

## Results

`npm run sim`, 2,000 children in each population:

|                                                             | Fast learners | Slow learners | Not learning |
| ----------------------------------------------------------- | ------------- | ------------- | ------------ |
| False mastery (required, under 5%)                          | 0.0%          | 0.5%          | 1.8%         |
| Reached Mastered                                            | 376           | 202           | 110          |
| Median items to mastery                                     | 65            | 72            | 72           |
| Core-block targets in the zone (reported)                   | 32.6%         | 56.1%         | 63.6%        |
| Sessions with a scaffold loop (required, under 2%)          | 0.0%          | 0.0%          | 0.0%         |
| Streaks of 3 first-try errors a session (required, under 1) | 0.02          | 0.03          | 0.04         |

The old model, on fast learners: false mastery 0.0%, 368 reached Mastered, a median of 73 items, 31.0% of targets in the zone. For children who do not learn, its false mastery was 5.7%.

## Consequences

- Mastery now rests on real evidence: about 45 informative answers for a skill whose σ threshold is 0.35, about 70 for 0.30. A strong child gets there in a few sessions, and the mock history shows that.
- σ now means how sure the model is. The skills' thresholds were set when it meant something else; a learning designer should review them together with the zone's target.
- Revisit with real histories: the two variances, the cautious margin, the thresholds, and whether per-child growth earns a place once there is data to fit it.
