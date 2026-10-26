# @learnofun/mock-api

Stands in for the real API while the frontend is built first (ADR 0001, ADR 0011). MSW handlers answer every endpoint under `/api`, and each one validates its request and its response against `@learnofun/contracts`.

## The data

All mock data lives in one file, `src/data/mock-data.json`:

- two families (ADR 0025): Sam's, on the free plan with a support override to two children, with Robin (8) and Ari (6); and Alex's, on the premium plan, with Nia (7). Sam is also a guardian in Alex's family;
- a draft skill graph of 25 maths skills and 5 early-English skills for ages 6–8 (ADR 0027), seven activities for Hop Line, Ten Frame Café and Tile Farm, the Hop Line item template and its misconceptions, and the games the content release includes: Hop Line (ADR 0035);
- the GB market's learning languages, default curriculum, a draft grade scheme (ADR 0026), and its experience bands: maths for ages 3–5, maths and literacy for 6–8 (ADR 0027);
- each child's past sessions as scripts, which the mock API plays through the real session engine into sessions and events when it starts (ADR 0028), backing up every skill status;
- entitlements.

Skill states and Today are not in the file: the learner model in `learning-core` works out the states from the events (ADR 0031), and its planner plans Today from them on every request, so Today changes after each session (ADR 0035).

It is validated against the contracts when it loads, and every reference must resolve, so a mistake fails loudly with the path to the problem.

## Endpoints

| Method and path                                           | What it does                                                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `GET /api/catalog`                                        | The skill graph, activities, item templates and misconceptions                                               |
| `GET /api/markets/:market`                                | A market's learning languages, default curriculum and grade scheme                                           |
| `GET /api/device/profiles`                                | Children who can play on this device: ID, nickname, avatar and whether they have a picture PIN               |
| `POST /api/device/profiles/:id/unlock`                    | Check a picture PIN entered in the picker (ADR 0018)                                                         |
| `GET /api/parent/accounts`                                | The mock sign-in's accounts, by name only (ADR 0025)                                                         |
| `GET`, `POST`, `DELETE /api/parent/session`               | Who is signed in to the dashboard; sign in as an account; sign out                                           |
| `GET /api/families/:id`                                   | One of the signed-in parent's families, with their role, its children and entitlements                       |
| `POST /api/families/:id/children`                         | Add a child, for an owner or guardian, within `children.max` (ADR 0026)                                      |
| `PUT /api/families/:id/children/:childId`                 | Edit a child's profile, for an owner or guardian                                                             |
| `GET /api/families/:id/children/:childId/learning`        | A child's subjects (from the band for their age), subject balance, time limits and goal (ADR 0027)           |
| `PUT /api/families/:id/children/:childId/time-limits`     | Set the session length, daily limit and break reminder, from the steps                                       |
| `PUT /api/families/:id/children/:childId/subject-balance` | Share practice between the child's subjects, in 10% steps                                                    |
| `PUT`, `DELETE /api/families/:id/children/:childId/goal`  | Pin a goal, one at a time (a skill and an end date need `goals.custom`), or clear it                         |
| `GET /api/children/:id/snapshot`                          | One child's profile, settings, skill states and play today                                                   |
| `GET /api/children/:id/today`                             | Today's cards, planned from the events: up to three, each its own activity (ADR 0035)                        |
| `PUT /api/children/:id/settings`                          | Save what child mode edits: play settings and the picture PIN (ADR 0027)                                     |
| `POST /api/children/:id/extra-time`                       | Allow more play today (ADR 0022)                                                                             |
| `POST /api/sessions`                                      | Start a session; a retry with the same ID returns the same session; premium activities need the premium plan |
| `POST /api/events`                                        | Ingest a batch of events, idempotent on the event ID, stored in sequence order                               |

`GET /api/families/:id/children/:childId/progress` gives a child's progress by skill and Today's explanations, with counts worked out from the events and answers graded again: a summary per strand with `insights.detail` basic, every skill too with full (ADR 0028).

`GET /api/families/:id/children/:childId/sessions` gives the child's sessions, newest first, with plan 5.2's measures from their events (ADR 0029): the headline with `insights.detail` basic, every measure and each question with full.

Family endpoints answer 401 when nobody is signed in, and 404 for a family the parent is not in, as if it did not exist (CLAUDE.md rule 4). Who may do what in a family is decided in one place, `src/policy.ts` (plan 8.1).

Errors share one shape: `{ "error": { "code", "message", "problems"? } }`.

## In the browser

`startMockApi()` from `@learnofun/mock-api/browser` starts MSW's service worker. Changes are saved in `localStorage`, so a refresh keeps them; saved state from an older data file is discarded for a fresh start. In development the app shows a panel to switch latency (normal, slow) and failure (none, offline, server error), and to reset the mock data.

May import only `@learnofun/contracts` and `@learnofun/learning-core`.
