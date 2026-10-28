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

## Record

The budgets are checked by the `performance` project of the web app's Playwright suite (`apps/web/e2e/performance.e2e.ts`), against the production build, after the other projects and one test at a time. The network is Lighthouse's mobile profile: 150 ms away, 1.6 Mbps down and 750 kbps up. The preview server gzips text files, as a static host does.

**Bundle caps, set 2026-10-27,** as gzip bytes of scripts and style sheets (in `apps/web/e2e/budgets.ts`):

| Area | Size | Cap |
| --- | --- | --- |
| The child area's first load (the profile picker) | 378,891 | 416,781 |
| The parent area (the overview, beyond the child area) | 8,973 | 9,871 |
| The play route (what every game loads beyond the child area) | 15,636 | 17,200 |
| Hop Line | 4,553 | 5,009 |
| Ten Frame Café | 5,297 | 5,827 |
| Tile Farm | 5,103 | 5,614 |

About 160 KB of the child area's first load is the mock API and its data (ADR 0011).

**Load times, first measured 2026-10-27, fail the budget.**
Over two runs:
- First visits took 7.8 to 9.7 seconds: the picker, Today, the library, each game, and the dashboard sign-in.
- Signed-in dashboard pages, with the app already cached, took 2.8 to 4.0 seconds. Goals and time passed in both runs; the plan passed in one.

Where a first visit of the picker goes, measured separately:

| Profile | Scripts downloaded | First paint | Main content |
| --- | --- | --- | --- |
| No throttling | 0.33 s | 0.96 s | 1.5 s |
| CPU 4× slower | 1.2 s | 2.6 s | 3.0 s |
| Slow 4G | 3.5 s | 4.2 s | 4.6 s |
| Slow 4G and CPU 4× (this budget) | 4.3 s | 5.7 s | 6.0 s |
| Fast 4G (9 Mbps, 60 ms) and CPU 4× | 1.9 s | 3.4 s | 3.7 s |

Nothing paints until the mock API has started, because the mock plays its scripted past sessions through the session engine on every load: about 0.6 seconds of main-thread work unthrottled and 1.5 seconds at 4× CPU. On slow 4G, the scripts alone take longer than 3 seconds to download. The budget is unchanged, and the failure goes to the human (FRONTEND-KICKOFF 15g).

**Speed-ups, 2026-10-27,** chosen by the human with the budget unchanged:
- Only Baloo 2, the child area's family, is preloaded. Andika and Readex Pro download when a page uses them, and the service worker still caches them all.
- The mock data file is checked by a unit test, which also shows that checking leaves it unchanged, instead of on every page load.
- The service worker installs while the mock API downloads, rather than after it. MSW starts once the worker controls the page, because MSW reloads a page its worker does not control.

After them:
- The picker's first visit takes 6.7 seconds, down from 8.6.
- The other first visits take 8.0–9.3 seconds.
- Signed-in pages took 3.1–4.6 seconds, because the app registered the worker again on every visit. A fix skips that once a worker controls the page; it has not been measured yet.

What remains is mostly the mock API working in the page:
- it computes each child's skills from every event for Today and the games;
- its 100 KB chunk downloads only after the app has started;
- the service worker caches the whole app before the mock can answer.

The CPU running React, Next.js and Zod adds about 1.5 seconds. The human chose to leave the budget failing for now and move on (2026-10-28).

## Consequences

- CI fails when a screen gets slower or a bundle grows by accident.
- The size caps start from what the app is now, not from a target; a learning designer or the team may tighten them later.
- The throttled profile is an approximation of a mid-range tablet; the human's tablet play-throughs remain the real check.
