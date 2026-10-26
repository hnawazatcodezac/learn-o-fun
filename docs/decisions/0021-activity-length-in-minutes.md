# 0021. An activity's length, in minutes

- Status: accepted
- Date: 2026-10-21
- Plan section: 3 (core domain model), 4.3 (the long-term planner and Today); FRONTEND-KICKOFF step 3e

## Context

The design system's ActivityCard shows "an approximate length in minutes" ("About 5 minutes"), and its README writes durations in minutes. Nothing in the plan or the contracts gives an activity's length: the experience band sets a session's length in items, not minutes.

## Options considered

1. **A `minutes` field on Activity**, set by the content team per activity. Simple and honest about being an estimate; one more field to author.
2. **Work it out**: items per session times a seconds-per-item figure. Nobody has decided the figure, and it would vary by game.
3. **No length on the card** until the content model has one.

## Decision

Option 1, as the team chose. `Activity.minutes` is a whole number from 1 to 30: the approximate length of one session of the activity. The card says "About {minutes} minutes" through an ICU plural. The mock data gives Hop Line 5.

## Consequences

- Every activity now needs a length; the schema requires it, so a missing one fails validation.
- The number is an estimate. When sessions are measured (step 15 and later), compare it with real durations and correct the content, or derive it.
