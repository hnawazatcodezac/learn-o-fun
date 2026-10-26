# 0029. Session history in the dashboard

- Status: accepted
- Date: 2026-10-22
- Plan section: 4.4, 5.2, 9; FRONTEND-KICKOFF step 10e; builds on ADR 0025 and ADR 0028

## Context

Step 10e shows a child's past sessions with plan 5.2's definitions, and its "Done when" is that every number shown traces back to mock events or fixtures. ADR 0025 put the measures in `learning-core` as pure functions of a session's events, and ADR 0028 made the past sessions scripts played into events. Four things were open: what the free plan shows against premium (`insights.detail`, plan 9), whether a session opens to its questions one by one, how the measures read, and which sessions are listed.

## Options considered

1. **By plan:** headline measures on free, every measure and the question-by-question detail on premium / every measure on both, the detail on premium / the same on both.
2. **Question by question:** each session opens to its items / totals only.
3. **How they read:** counts, such as "6 of 8 first tries right" / percentages.
4. **Which sessions:** all, newest first, by week / the last 30 days.

## Decision

The first option each time, as the team chose.

- **The measures are plan 5.2's**, worked out in `learning-core` from one session's events, with answers graded again by the shared grader:
  - items presented, attempted (at least one answer), skipped, and unanswered (presented, never answered nor skipped: plan 5.2's "abandoned");
  - first-try accuracy: right on the first answer with no help, out of the items attempted;
  - eventual success: right in the end, out of those attempted;
  - supported: a hint or a worked example was used, out of those attempted;
  - learning credit: wrong at first and right later, celebrated as keeping going and never counted towards mastery;
  - time on task: active play only, leaving out pauses and any gap of more than 30 seconds between events (a typed config);
  - the status: completed, ended early, interrupted (resumable for 24 hours) or expired, from the session's own end events and the time now.
- **Each item's outcome**, for the question-by-question view: right first time, right after another try, right with a hint, shown how, not yet, skipped, or not answered.
- **By `insights.detail`:** with basic (free), each session's day, activity, status, time on task and first-try accuracy; with full (premium), every measure and each session's questions too. The API shapes the answer, so the free plan's answer never carries the rest.
- **Counts, not percentages,** as the design system's voice shows the evidence: "6 of 8 first tries right", "Kept going: 2 right after a first miss". Game scores never appear (CLAUDE.md rule 9).
- **Every session, newest first, by week** in the family's time zone ("Week of 12 October").
- Plan 4.4's DIFFICULTY_STEP explanation joins the question-by-question view when the real in-session policy arrives (step 13); the placeholder policy never changes difficulty.

## Consequences

- The history, the progress page and Today's explanations all count the same events with the same grader, so they agree.
- A session played on the device appears with the scripted ones, its answers graded again from the items its IDs name.
- The list grows with every session; paging can come when real families have months of history.
