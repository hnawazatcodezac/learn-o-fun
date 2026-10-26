# 0013. The hint button: one hint per item

- Status: accepted
- Date: 2026-10-20
- Plan section: 4.2 (support ladder, Practice and Challenge), 5.1 (events), 5.3 (evidence weights), 6.1 (game shell), 6.2 (contract)

## Context

Plan 6.1 puts a hint button in the game shell. Plan 4.2 describes only hints that follow wrong answers: encouragement and a retry, then a game-specific hint, then a worked "show me". Plan 5.3 weighs a "first attempt after a hint" (0.5 if correct, 1.0 if wrong), so children can ask for a hint before answering, but the plan does not say what the button does or how the game shows such a hint.

## Options considered

1. **One hint per item.** The button shows the game's hint and records it; it then turns off for that item. Wrong answers still climb the usual ladder.
2. **Climbs the ladder.** A first press shows a hint; a second shows the worked "show me" and moves on to the next item.
3. **No button yet.** Leave it out until the real in-session policy (FRONTEND-KICKOFF step 13).

## Decision

The team chose option 1:

- The hint button appears in Practice only; Challenge has no hints (plan 4.2).
- It works while the child is answering an item whose support so far is below a hint. Pressing it records `hint_shown` and raises the item's support so far to `hint`, so the next answer carries it (plan 5.1, 5.3). The button then turns off for that item, as it does once the ladder has given a hint.
- Support so far on an item only ever rises: a wrong answer after a requested hint gets encouragement and a retry, but the answer after it still records `hint`.
- `hint_shown` levels count the hints on the item: a requested hint is level 1, and a ladder hint after it is level 2.
- Games show a requested hint through a new `GameInstance.hint(level)` method, alongside `feedback()`; the session engine gains `canRequestHint` and `requestHint`, and the session controller `hint()`.

## Consequences

- Every game implements `hint(level)`; `create-game` scaffolds it, and the conformance suite (step 7d) can check it.
- A child who asks for help gets it once per item without losing the chance to answer, and the evidence weights see that help.
- The real policy (step 13) may revisit how a requested hint affects the ladder; it keeps the same events.
