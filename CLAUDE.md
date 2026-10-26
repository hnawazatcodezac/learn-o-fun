# Learnofun

Adaptive learning-games platform for children aged 3–18. First public release: maths for ages 3–8 and early English for ages 6–8, in one market.

This is a fresh build. Never copy, port, or imitate code from the earlier Learnofun prototype.

## Source of truth

- Product and technical plan: `docs/plan.md`. Read the section that covers your task before starting. If a request conflicts with the plan, stop and ask.
- Game catalog and game brief template: `docs/game-library.md`.
- Design system: `docs/design-system/README.md` and `tokens.json`. Use its tokens by name; never invent colours, fonts or sizes.
- Architecture decisions: `docs/decisions/`. Write an ADR (copy `0000-template.md`) when you make or change a significant decision.
- First sessions and prompts: `docs/FRONTEND-KICKOFF.md`.

## Current phase

Web frontend only. Follow docs/FRONTEND-KICKOFF.md. Do not build apps/api, apps/worker or a database; all data comes from mock handlers that follow packages/contracts.

## Stack

- TypeScript (strict) everywhere. npm workspaces + Turborepo (ADR 0002).
- `apps/web` (child area at `/`, parent dashboard at `/parent`; ADR 0007) and the future `apps/site`: Next.js (App Router) and React (ADR 0042). `apps/web` is a static export of client components; Next.js is never the backend. `apps/studio`: React + Vite. `apps/api` + `apps/worker`: Node + Fastify. PostgreSQL.
- Styling: Tailwind CSS v4, its theme generated from `docs/design-system/tokens.json`, with only design-system values (ADR 0043).
- next-intl with ICU messages for translations, Serwist for the service worker, MSW in the browser for mock data, `next/font` with local font files.
- Moving to Next.js and Tailwind is FRONTEND-KICKOFF step 1, reopened; until it is done, `apps/web` still runs on Vite and plain CSS, as the Commands below describe.
- Games: DOM/SVG for UI-like games, PixiJS for scene-heavy games, Rive for character animation.
- Contracts: Zod schemas in `packages/contracts`; OpenAPI and typed clients are generated from them.
- Tests: Vitest (unit), fast-check (property), Playwright (E2E and visual), Testcontainers PostgreSQL (integration).

## Layout

```
frontend/      web frontend workspace (ADR 0003); run npm commands here
  apps/        web: child area at / (src/child) · parent dashboard at /parent (src/parent)
  packages/    contracts · learning-core · game-sdk · games/<game-id> · ui-kit · i18n · mock-api
  tools/       ui-preview · game-sandbox · simulator
  .github/     CI workflow
docs/          plan.md · game-library.md · FRONTEND-KICKOFF.md · KICKOFF.md · decisions/
```

Outside the current scope (plan 2.6): apps `studio`, `api`, `worker`; packages `content`, `config`; tool `content-cli`. Where they live is decided when backend work starts. The landing site is `frontend/apps/site`, from FRONTEND-KICKOFF step 18 (ADR 0039).

## Commands

Run from `frontend/`:

- Install: `npm install`, then `npx playwright install chromium` once for the smoke tests
- Dev: `npm run dev`, then http://localhost:5173 (child area: who's playing, then `/today` and `/library`) and http://localhost:5173/parent (parent dashboard: sign in as Sam, in two families, or Alex, in one). In the mock data, Ari has the picture PIN sun, fish, star; Robin has none
- Play an activity from the catalog, sending its events to the mock API: http://localhost:5173/play/hop-line-add-within-20 (`?mode=challenge` for Challenge)
- Play any game's stories in the game shell (development only): http://localhost:5173/play/dev/hop-line, with `?story=`, `?mode=challenge` and `?seed=`
- On a tablet or phone on the same network: `npm run dev:lan`, then open the Wi-Fi "Network" address Vite prints (plain HTTP; the mock API answers from inside the page, ADR 0017)
- Build: `npm run build` (includes the mock API until a backend exists; `VITE_API_MODE=live npm run build` leaves it out, ADR 0011). The build is an installable PWA whose service worker caches the whole app and serves MSW's worker too (ADR 0024); see it with `npm run preview -w @learnofun/web`, then http://localhost:4173. The development server has no caching. Placeholder app icons: `npm run icons -w @learnofun/web`
- Mock data: one file, `frontend/packages/mock-api/src/data/mock-data.json`. In development, the panel in the bottom corner switches the mock API to slow, offline or server error, and resets its saved state
- Pseudo-locales (development only): the Language menu in the corner, or `?locale=en-XA` (long accented text) and `?locale=en-XB` (right to left)
- Lint (ESLint with boundary, purity and UI-text rules; Stylelint for logical CSS; then Prettier check): `npm run lint`; fix formatting with `npm run format`
- Typecheck / unit tests / Playwright tests (including WCAG 2.2 AA checks): `npm run typecheck`, `npm test`, `npm run e2e` (each suite builds the app it tests and serves it with `vite preview` on a port of its own, never reusing a running server; the web app's is a test build with the development tools, its PWA tests a production build; ADR 0041)
- UI kit preview: `npm run dev:ui`, then http://localhost:5175
- Game sandbox (any game, story, item, band, locale and theme, with the learning-event log and live reload): `npm run dev:sandbox`, then http://localhost:5176
- Screenshot tests (Docker Desktop must be running; ADR 0006): `npm run visual`; after an intended visual change, `npm run visual -- --update-snapshots` and review the images
- New game: `npm run create-game -- <game-id> [--name "Display name"]` (scaffolds `packages/games/<game-id>`, registers it, adds its strings)
- Game conformance suite (every game and story, in the shell and the sandbox; ADR 0014): `npm run conformance`
- Learner simulator gates: `npm run sim` (2,000 synthetic learners learning fast, slowly and not at all, through the real engine, policy and learner model; prints every plan 4.6 gate for each, fails on a required one; ADR 0031, ADR 0034)

## Non-negotiable rules

1. API modules talk only through public interfaces or in-process domain events, never each other's tables. The dependency linter must pass.
2. `packages/learning-core` is pure: no I/O, no `Date.now()`, no `Math.random()`. Inject the clock and a seeded RNG.
3. Learning events are append-only. Never update or delete an event; derive state as rebuildable projections.
4. Every tenant table has a non-null `family_id` and a row-level security policy. Every endpoint gets a cross-tenant test.
5. No hard-coded user-facing strings: use ICU message keys. Right to left: logical directions only, in CSS (`margin-inline-start`, never `margin-left`) and in Tailwind (`ms-`, `ps-`, `start-`, `text-start`, never `ml-`, `pl-`, `left-`, `text-left`), enforced by lint.
6. Child area (`/` in `apps/web`): no third-party analytics, ads or tracking SDKs; no free-text input from children; a parental gate before settings, purchases, external links and leaving child mode, including the way into `/parent`. The child area never imports parent-area code (ADR 0007).
7. Collect only: child nickname, birth year and month, learning language. Never full date of birth, photos, voice, location or contacts.
8. Timestamps are UTC `timestamptz`. IDs are UUIDv7; sessions and events get their IDs on the device.
9. Game scores never feed learning measures. Mastery comes only from the evidence rules in `learning-core`.
10. Parent-facing copy uses growth language. Never "weak", "failing" or "behind", and never compare children with each other.
11. Next.js is never the backend (ADR 0042). `apps/web` is a static export: no Server Actions, route handlers or server components that read or write children's data; no route segments with runtime IDs; no middleware or `next/image` optimization. Games and play screens are client components, loaded with `next/dynamic` and `ssr: false`. Only `apps/site` renders on the server, and it never holds children's data.
12. Tailwind uses design-system values only (ADR 0043): the theme is generated from `tokens.json`, with no default colours, spacing, radii, shadows or font sizes and no arbitrary values; every interactive element shows `focus-visible:shadow-focus-ring`; motion uses `motion-safe:` and `motion-reduce:`.

## How to work

- Explore, then plan, then code. Propose a plan before any change that touches more than one package.
- Keep changes small and reviewable: one concern per commit, conventional commit messages.
- Add or update tests with every change. Run lint, typecheck and tests before saying a task is done.
- If something is not decided in the plan, ask instead of inventing it, then record the answer as an ADR.
- Explain any new dependency before adding it.
- Do not add Redis, Kafka, Kubernetes or separate services; the plan defers them deliberately.
