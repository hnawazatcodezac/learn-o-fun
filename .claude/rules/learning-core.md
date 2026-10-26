---
paths:
  - "frontend/packages/learning-core/**"
  - "frontend/tools/simulator/**"
---

# learning-core and simulator rules

The learning core runs identically in the browser and in Node. It is the heart of adaptive learning (plan sections 4 and 5).

## Purity

- Pure functions only: inputs in, decisions out. No network, storage, timers or globals.
- Inject the clock and a seeded RNG. The same inputs must always produce the same decisions.
- No Node-only or DOM-only APIs.
- Every threshold and weight lives in a typed config object with defaults. No inline magic numbers.

## Decisions

- Every policy decision returns a reason code (for example `FRONTIER_READY`, `REVIEW_DUE`, `PREREQ_SUPPORT`, `DIFFICULTY_STEP`).
- Every policy has a version string. Bump it whenever behaviour changes.

## Evidence weights (plan 5.3)

| Observation | Weight |
| --- | --- |
| First attempt, no help, item not seen in last 14 days | 1.0 |
| First attempt after a hint | 0.5 if correct, 1.0 if wrong |
| Second or later attempt on same item | 0 (record it; it earns learning credit) |
| Planned re-ask later in session | 0.3 |
| Item seen in last 14 days | 0.3 |
| Scaffold item | 1.0 toward its prerequisite skill, 0 toward target |
| Skip | no ability update |
| Response time | never affects mastery |

## Mastery gate (plan 4.1)

All must hold: predicted success at least 0.85 at mastery difficulty with σ below the skill threshold; at least 8 full-weight observations on at least 6 distinct items; evidence from at least 2 sessions on 2 different days; at least 4 correct in the last 5 full-weight observations; broad skills need evidence from at least 2 activities.

## Tests

- Unit tests for every rule.
- Property tests (fast-check) for invariants: repeats and later attempts never raise mastery evidence; weights stay in [0, 1]; ability updates are bounded.
- Golden scenarios with the exact expected decisions and reason codes.
- Simulator gates in CI: false-mastery rate under 5%, scaffold-loop sessions under 2%, at least 70% of items in the success zone.
- Never loosen a simulator gate to make a change pass. Report the failure instead.
