# 0025. The parent dashboard's data: sign-in, history, early signal and subject balance

- Status: accepted
- Date: 2026-10-22
- Plan section: 1 (family dashboard), 4.1, 4.3, 4.4, 5.2, 8.1, 9; FRONTEND-KICKOFF step 10

## Context

Step 10 builds the parent dashboard against the mock API: a mock sign-in and family switcher, child profiles, goals and limits, progress by skill with "early signal", explanations from reason codes, session history by plan 5.2's definitions, and plan views by feature key. Its "Done when" asks that every number trace back to mock events or fixtures. Four things were not decided: where past sessions come from (the mock data had none), what "early signal" counts before step 11's evidence rules, the shape of the subject balance, and what the sign-in and switcher are.

## Options considered

1. **History:** session scripts in the mock data, expanded into events / the events written out in full / only sessions played on the device.
2. **Early signal:** first-try, unaided answers counted from the events / a fixture field.
3. **Subject balance:** a share per subject per child / one balance per family / a "lean towards" choice.
4. **Sign-in:** pick a fixture account, one of which belongs to two families / one account and a development switcher.

## Decision

The first option each time, as the team chose.

- **Past sessions are scripts.** `mock-data.json` holds a short script per past session: when it started, the activity and mode, and per item whether it was right first time, right after a retry or a hint, shown a worked example, or skipped. At start the mock API plays each script through the real session engine (`learning-core`) into learning events, the same every time, and stores them like any other events. Every number on the dashboard is worked out from events.
- **Measures in `learning-core`.** Plan 5.2's definitions (items presented, attempted, skipped and abandoned; first-try accuracy, eventual success, supported rate, learning credit; session status; time on task, leaving out pauses and idle gaps over 30 seconds) are pure functions of a session's events. The mock API serves them as projections it can rebuild (CLAUDE.md rule 3).
- **Early signal counts first tries.** Until step 11, a skill's evidence is its first-try, unaided answers in the events. Below plan 4.1's mastery minimum, 8 of them on at least 6 different items, the dashboard shows "early signal". Step 11 replaces the count with the real evidence weights, behind the same function.
- **Subject balance is per child**: a share for each subject the child's band offers, in steps of 10% that add up to 100, kept in the child's settings. A child with one subject shows no balance. The planner (step 13) will use it.
- **Mock sign-in picks an account.** `/parent/login` lists the fixture parent accounts, with no password: the mock API keeps who is signed in, as a real API would keep a session. One account belongs to two families, one on the free plan and one premium, so the family switcher and the plan views have both to show. Every parent endpoint answers only for the signed-in account's families, and each has a test that another family's data is refused (CLAUDE.md rule 4). Asking who is signed in (`GET /api/parent/session`) answers with no session when nobody is, rather than 401: being signed out is normal, and a 401 would show in the browser as a failed request. The device remembers the family last chosen in the switcher; a remembered family the signed-in account does not belong to is ignored, and the first of its own is shown.

## Consequences

- The dashboard looks lived-in from the first run, and its numbers can be checked against events.
- The session scripts must stay valid as the engine and policy change: they are played through them, so a test fails if a script no longer fits.
- Step 11 changes what "early signal" means without changing the screens.
- Real authentication, sign-up and consent are not built here; the mock sign-in is development only.
