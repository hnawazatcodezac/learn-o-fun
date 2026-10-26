# 0022. Session shape, session length, the daily limit and break reminders

- Status: accepted
- Date: 2026-10-21
- Plan section: 4.2 (in-session adaptation, "Shape the session"), 8.7 (healthy use); FRONTEND-KICKOFF step 9b

## Context

Plan 4.2 says a session warms up with 1–2 review items, runs a core block, and always ends on a success, with its length from the experience band and the parent's limits. Plan 8.7 asks for daily time limits on by default and break reminders. The child settings already hold `dailyLimitMinutes`, `sessionMinutes` and `breakReminderMinutes`, and the events contract already has a `time-limit` end reason, but nothing used them. Real review items need the learner model (step 12), and the full in-session policy is step 13. Several choices were not in the plan; the team made them.

## Options considered

1. **Warm-up and ending:** easy items from the activity's own template now / an ending on success only, warm-ups later / mock review items from the learner states now.
2. **Length:** items from the band, capped by the session minutes / minutes only / six items for every band until step 13.
3. **Daily limit:** a calm stop with a grown-up's "more time today" / the same stop with no override / minutes counted on the device only.
4. **Breaks:** a friendly pause where the child chooses / a required break of a fixed length.

## Decision

The first option each time, as the team chose.

- **Session shape, until step 13.** A session plan in `learning-core` lays the items out as a warm-up, a core block and a pool of easy items to end on. The placeholder policy presents the warm-up (role `warm-up`), then the core block in order; if the last item did not end in a correct answer, it presents easy items (role `ending`, a new item role) until one is right or the pool runs out. The activity route builds the items from the activity's template: two warm-ups and two ending items at its easiest level, and the core block ramping up. Development stories keep their own items and no plan.
- **Length.** The band sets the core block: 4 items for ages 3–5 and 6 for ages 6–8, after the 2 warm-ups (the team can change the numbers in one place). The parent's `sessionMinutes` caps it: once that much active play has passed, the session finishes the item on screen and moves to its ending. Active play leaves out pauses.
- **Daily limit.** The mock API works out today's play from the stored events, as a projection it can rebuild (CLAUDE.md rule 3), with "today" in the child's time zone, and the child's snapshot carries the seconds played and allowed. With no time left, Today, the library and the play route show "That's all for today" instead of activities. A session that reaches the limit finishes its item, ends on a success and stops, with the end reason `time-limit`. Behind the parental gate, a grown-up can allow one more session today: the child's `sessionMinutes` more, recorded for that day only.
- **Breaks.** After `breakReminderMinutes` of play today since the last break, the shell pauses before the next item (pause reason `break`, a new one) and shows "Time for a stretch" with Keep playing and Stop for now. Either choice starts the count again. It is a reminder, not enforced. Where the last break was is kept on the device.
- New reason codes for the policy's choices: `WARM_UP`, `END_ON_SUCCESS` and `TIME_UP`.

## Consequences

- Sessions now start easy and end well, and the events say which items were warm-ups and endings, so evidence rules (step 11) can weigh them apart.
- Step 13 replaces the warm-up with real review items and the placeholder policy with the real one, behind the same interface; the plan and wrap-up stay.
- The daily limit is only as good as the events that reach the API: a session still waiting in the device's outbox (ADR 0023) counts once it is sent, and the device counts its own sessions at once.
- Revisit the break if the UAE rules for mandatory breaks apply to the product: that needs a break length in the settings.
