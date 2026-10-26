# 0033. The success-zone gate: what it counts, and why it fails for now

- Status: accepted; the outcome of step 13b in ADR 0034
- Date: 2026-10-22
- Plan section: 4.1, 4.2, 4.6; FRONTEND-KICKOFF step 13; amends ADR 0031 and ADR 0032

## Context

Step 13a built plan 4.2's in-session policy (ADR 0032) and ran it through the simulator's 2,000 synthetic children. Three release gates pass with room to spare: false mastery 0.0% (under 5%), sessions with a scaffold loop 0.0% (under 2%), streaks of 3 first-try errors 0.03 a session (under 1). The fourth, at least 70% of items inside the success zone, judged on each child's true chance of success, fails: 25.8% of every item, 31.0% of the core block's targets.

The simulator shows two causes, and rules out a third:

- **What the gate counts.** Plan 4.2 makes warm-ups, scaffolds, bridges and the item to end on easy on purpose. They are about a quarter of all items, so counting every item caps the gate near 70% even if every target were perfectly aimed.
- **The learner model.** Its uncertainty shrinks by a fixed 8% with every answer (ADR 0031), whatever the answer shows, so after about 20 answers each one moves the ability by little more than 0.1. A child who is learning outruns it: by the twelfth session the model sits about 2 points below the child's true ability, and two-thirds of targets are too easy. Even synthetic children who never learn, slip or guess get only 54% of targets in the zone, because every child starts from the same estimate (placement, plan 4.3, is not built yet) and the model converges slowly from there.
- **Not the policy.** Making the policy's in-session estimate more responsive, or letting it change level more often, changed nothing measurable. A prototype model whose uncertainty shrinks by what each answer shows and grows with practice and time away took the targets from 31% to 40%: better, still short.

## Options considered

1. **What the gate counts:** the core block's targets, the items the policy aims at the zone / every item, as plan 4.6 words it.
2. **While it fails:** report it as a known failure and rebuild the learner model in a new step before the planner / the same, but after step 13 / keep it required, so CI fails until it passes.

## Decision

The first option each time, as the team chose.

- **The success-zone gate counts the core block's targets.** Its target stays at 70%; plan 4.6's "items" is read as the items the policy aims at the zone. The report also prints the share over every item.
- **Scaffold loops and error streaks are required from now**, with false mastery. The success-zone gate is reported, marked as failing in every run, and not yet required.
- **A new step, 13b, rebuilds the learner model** so it can follow a child who is learning, before the planner, which becomes 13c; the play route becomes 13d. When the gate passes, it becomes required. If no sound model reaches 70%, the target goes to a learning designer for review. It is never loosened to make a change pass.

## Consequences

- CI stays green while the failure stays in plain sight: every `npm run sim` prints it.
- The dashboard's statuses come from the same model, so step 13b may move them; the mock scripts and the tests that pin their statuses are checked again then.
- Revisit when step 13b ends, or at once if a gate that passes now starts to fail.

**Outcome (ADR 0034).** Step 13b found that no estimate of ability can reach 70% of targets from a first session: exact Bayes gets 64.7% on the easiest synthetic children. The new model is honest about its uncertainty and passes every required gate for fast, slow and non-learning children. The 70% target went to a learning designer, and the gate stays reported until they set one the evidence allows.
