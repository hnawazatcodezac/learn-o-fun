# 0028. Progress by skill, its evidence, and Today's explanations

- Status: accepted
- Date: 2026-10-22
- Plan section: 4.1, 4.4, 5.2, 9; FRONTEND-KICKOFF step 10d; builds on ADR 0025

## Context

Step 10d shows a child's progress by skill, with "early signal" when the evidence is thin, and explains Today's recommendations from their reason codes. ADR 0025 settled that past sessions are scripts played into events, and that early signal counts first-try, unaided answers below plan 4.1's minimum of 8 on at least 6 different items. Four things were open: the scripts were planned for 10e, after the progress they feed; the numbers in Today's explanations were typed into the mock data; what the free plan's "essentials" show against premium's "skill by skill, in full" (`insights.detail`, plan 9); and which skills the progress lists.

## Options considered

1. **Order:** build the session scripts in 10d / keep them in 10e, so progress shows nearly only early signal until then.
2. **Explanation numbers:** worked out from the events / typed in the mock data and checked against the events.
3. **Insights by plan:** a summary per strand on free, every skill with its evidence on premium / every skill on both, with evidence on premium only.
4. **Skills listed:** every skill in the child's subjects / only those with a status.

## Decision

The first option each time, as the team chose.

- **Session scripts come first, in 10d.** `mock-data.json` holds each child's past sessions as scripts: when each started, the activity and mode, and for each item its skill and how it went: right first time, wrong first time then right, right after a hint, shown a worked example, or skipped. At start the mock API plays every script through the real session engine in `learning-core`, with generated number items so the real grader marks each answer, into sessions and learning events, the same every time. The scripts are written to back up each fixture skill status, and a test checks it: a strong, mastered or review-due skill has at least the mastery minimum of evidence. Step 10e builds session history on the same events.
- **Evidence from the events.** A pure function in `learning-core` counts, per skill, first-try unaided answers, how many were correct, how many different items, and in how many sessions. Below 8 first tries on 6 items it is early signal. The skill statuses stay fixtures until the learner model (step 12).
- **Explanations from codes and events.** Each Today card's reasons keep their code and what the planner named, such as the related skill or the goal; the counts in the text come from the same evidence function, so the explanation and the progress page always agree. The text comes from localized templates, in growth language, with the child's nickname and no pronouns, since Learnofun does not know a child's gender.
- **Insights by `insights.detail`.** With `basic` (free), the progress API answers with a summary per strand: how many skills are in each status. With `full` (premium), it lists every skill with its status, its evidence and early signal. Both plans get Today's explanations. The API shapes the answer, as plan 9 says, so the free plan's answer never carries the detail.
- **Every skill in the child's subjects,** from the market's band for their age (ADR 0027), grouped by subject and strand, not started ones included, so parents see what lies ahead.

## Consequences

- Every number the dashboard shows traces back to events from the scripts, or to fixtures where the planner and the learner model will later decide (the statuses, review dates, related skills).
- Changing the engine or the policy replays the scripts differently; the tests that check the scripts against the statuses catch any that no longer fit.
- The free plan's progress is a summary; the upgrade is offered in words on the Plan page only.
- When step 12 computes statuses from evidence, the fixture statuses go, and the scripts stay as the history.
