# 0041. The Playwright suites run on built apps

- Status: accepted; superseded in part by 0042 (the suites build with Next.js instead of Vite; testing on built apps stays)
- Date: 2026-10-23
- Plan section: 6.8, 12.2; FRONTEND-KICKOFF step 15a

## Context

On 2026-10-22 and 2026-10-23, four browser checks (one in the sandbox, two in the UI preview and the web app's "leaving early" check) each waited more than 5 seconds for their page's first element, then passed on a rerun. The kickoff asked for the cause to be found and fixed, not for longer timeouts.

The two suspects in the kickoff were cleared. A cold development server adds about 0.3 s to a first load, and Vite 8 bundles dependencies when it starts and did not bundle again mid-run. The cause is how a development server serves the app: as about 120 separate modules, which the browser discovers and fetches in a chain. Each fresh test browser pays that: about 1.3 s per sandbox page on an idle machine, through four workers. The chain stretches with the machine's load. Measured over 48 sandbox loads:

| Server | Idle: median | Six busy threads: median, worst | Conformance running alongside: median, worst |
| --- | --- | --- | --- |
| Development server | 1.32 s | 2.39 s, 3.86 s | 3.17 s, 5.13 s (2 over 5 s) |
| Built sandbox | 0.63 s | 0.64 s, 2.61 s | |

A long run, or anything else busy on the machine, pushes development-server loads past the 5-second wait. CI's smaller machines would do the same more often.

## Options considered

1. **Run the suites on built apps:** a few bundled files per page, half the time at rest and barely slowed by load; each suite builds its app first, which takes seconds.
2. **Keep the development servers with fewer workers:** less load from the suite itself, but runs take about 1.5–2 times as long, and contention from outside the suite still applies.

## Decision

The first option, chosen by the human on 2026-10-23.

- **The web app** has a test build, `npm run build:e2e -w @learnofun/web` (`vite build --mode e2e`, into `dist-e2e/`): bundled as for production, with the development tools the tests use: the pseudo-locales and the Language menu, the mock API panel, the game stories route, and MSW's own worker without caching. One constant, `__DEV_TOOLS__`, decides them. `vite.config.ts` defines it as true on the development server and in the test build and false in production, and since it is replaced when the code is built, production leaves the code out entirely. A production-build test checks that none of the tools are there.
- **The sandbox and the UI preview** get `build` and `preview` scripts.
- **Every suite builds what it tests and serves it on a port of its own:** the web app on 4174 (its production build stays on 4173 for the PWA tests), the UI preview on 4175, the sandbox on 4176, the conformance suite's web app and sandbox on 5183 and 5186, and each game's suite its sandbox on the port it had. None reuses a server already running, so a run never tests a development server the human has open, which may be out of date.
- **The UI preview's screenshot tests** stay on the development server for now. They cannot be checked against the build without Docker, and Docker was not running; they move once they have been (FRONTEND-KICKOFF 15d).

## Consequences

- A first load in a test is about half as long and stays short when the machine is busy, without any timeout raised.
- The suites test what ships, bundled, rather than the development server; the human's development servers are no longer used by tests.
- Each suite starts with a build of a few seconds.
- The development tools exist in two kinds of build. Production stays clean only while every check of them goes through `__DEV_TOOLS__`; the production-build test and step 15g's bundle report guard that.
- Revisit if a test needs something only a development server does, such as hot reloading.
