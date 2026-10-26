# 0042. Next.js for the frontend

- Status: accepted
- Date: 2026-10-26
- Plan section: 2.1, 2.6, 11; FRONTEND-KICKOFF step 1

## Context

On 2026-10-26 the human decided to move the frontend from React + Vite to Next.js. Plan 2.1 had chosen a React single-page app built with Vite for the child app and a React app for the family dashboard, which "needs no server rendering"; the marketing site was a separate static site. Since step 3a both areas live in one app, `apps/web` (ADR 0007), and steps 2–14 rest on Vite: i18next (ADR 0004), MSW in the browser (ADR 0011, ADR 0017), vite-plugin-pwa (ADR 0024) and Vite test builds (ADR 0041).

## Options considered

1. **Next.js (App Router) for every app:** one framework across the child area, the parent dashboard and the public website, and server rendering for the website's SEO. Costs: moving `apps/web`, and the limits of a static export (no route segments with runtime IDs, no image optimization, no middleware).
2. **Keep React + Vite, with Next.js only for the website:** no move, but two frameworks.

## Decision

The first option.

- `apps/web` (the child area at `/`, the parent dashboard at `/parent`) and the future `apps/site` use Next.js with the App Router, React and strict TypeScript, in the existing npm workspaces + Turborepo monorepo (ADR 0002). `apps/web` stays one app (ADR 0007), as the human chose over separate `apps/play` and `apps/family`.
- `apps/web` is a static export (`output: 'export'`), so it works offline as a PWA and can be wrapped with Capacitor later. It has no route segments with runtime IDs: the child, the activity and the session go in app state or the query string. No `next/image` optimization and no middleware.
- Every game and play screen is a client component. Games load with `next/dynamic` and `ssr: false`, since PixiJS, Rive, IndexedDB and audio run only in the browser.
- Next.js is never the backend: no Server Actions, route handlers or server components that read or write children's data. All data goes through `packages/contracts`: to the mock API now, the Fastify API later.
- next-intl with ICU messages for translations, Serwist for the service worker, MSW in the browser for mock data, and `next/font` with local font files. The apps never request fonts from Google at runtime.
- `apps/site`, the public website, may use server rendering and static generation for SEO, but never holds children's data.
- The shared packages (`contracts`, `learning-core`, `game-sdk`, `ui-kit`, `i18n`, `mock-api`) stay framework-independent TypeScript.
- The development tools, the game sandbox and the UI preview, move to Next.js too (the human decided on 2026-10-26, over keeping them on Vite).
- The move is FRONTEND-KICKOFF step 1, reopened in sub-steps. Steps 2–14 keep their ticks for the Vite work they record.

## Consequences

- One framework for all three apps, and SEO for the website without a second stack.
- URLs with IDs move to the query string, such as the play route (`/play/hop-line-add-within-20` today) and the dashboard's child pages.
- ADR 0004, ADR 0024 and ADR 0041 are superseded where they name Vite-era tools. Their rules stand: ICU messages, an installable PWA that also serves MSW's worker, and suites that run on built apps.
- Revisit if a feature seems to need a server inside the frontend: that needs its own ADR, since the plan keeps the backend in Fastify.
