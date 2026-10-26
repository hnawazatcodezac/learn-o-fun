# 0040. Performance budgets for the app's own screens

- Status: accepted
- Date: 2026-10-23
- Plan section: 6.7, 12.2; FRONTEND-KICKOFF step 15

## Context

Step 15 enforces performance budgets in CI. Plan 6.7 sets a game's: it loads in under 3 seconds on a mid-range tablet over 4G, and its bundle is under 1.5 MB, excluding the shared runtime and audio (the conformance suite already checks the size). The plan sets none for the app's own screens: the profile picker, Today, the library, the play route and the parent dashboard.

## Options considered

1. **3 seconds, like the games, and sizes from the day they are measured:** every screen loads in under 3 seconds on a throttled mid-range profile, and each bundle may grow at most 10% past its size when the budget is set.
2. **Measure first, then choose numbers** with the human.

## Decision

The first option, chosen by the human on 2026-10-23.

- **Load time:** every screen of the production build shows its main content in under 3 seconds on a throttled mid-range profile, measured in Playwright: the CPU slowed four times and a 4G network.
- **Bundle sizes:** compressed sizes for the child area's first load, the parent area and each game, each capped at its size on the day the budget is set plus 10%. Growth past a cap is a deliberate change: raise it in this ADR's record with the reason, never to make a build pass.

## Consequences

- CI fails when a screen gets slower or a bundle grows by accident.
- The size caps start from what the app is now, not from a target; a learning designer or the team may tighten them later.
- The throttled profile is an approximation of a mid-range tablet; the human's tablet play-throughs remain the real check.
