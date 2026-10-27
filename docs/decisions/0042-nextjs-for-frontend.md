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
  - Built in step 1a: the worker is bundled with esbuild after `next build` and given the list of every exported file by Serwist's `@serwist/build`, as the Vite plugin did, so every page and its router data is cached. Serwist's Turbopack plugin was tried and set aside: it serves the worker from a route handler and lists Next's internal build folder, not the export.
  - MSW and the translations start in a client-only module (`next/dynamic`, `ssr: false`): MSW's browser module has no server build, and the app needs the page's address to pick its locale.
  - The tests and `npm run preview` serve a static export with `scripts/serve-static.mjs`, as a static host does: `/today` is `today.html`, and an unknown address gets `404.html`.
  - Built in step 1f: use-intl, next-intl's core, replaces i18next. `packages/i18n` makes the translator with use-intl's framework-free core (games and tests use it too), and `packages/ui-kit` gives it to React with use-intl's provider and hooks, which every app shares. `apps/web`, a static export of client components, uses none of next-intl's routing or server rendering, so it has no next-intl package of its own; `apps/site` adds next-intl for its server-rendered pages. The pseudo-locales still change the text after formatting.
  - Built in step 1g: the fonts load with `next/font/local`, as the human chose on 2026-10-27, from the Fontsource packages' files. `npm run fonts -w @learnofun/ui-kit` generates each app's `src/app/fonts.ts` (next/font needs its options written out): a call per family and subset, every face under the family's own name, so the tokens' stacks keep their names and a browser downloads only the subsets a page shows. Only the Latin faces are preloaded, and they bring the fallback font next/font sizes to match, which each app sets on `<html>` and the tokens' stacks use just before their generic families. A letter the families lack now shows in that fallback, Arial, rather than in the system font; only the long pseudo-locale has such letters. The service worker precaches the Latin and Latin Extended files by their kept names.
  - Built in step 1g: the conformance suite measures a game's bundle with esbuild instead of Vite's library build, as the human chose; esbuild's minifier makes the same code about a fifth smaller. Vitest still runs on Vite, which comes with it.
- `apps/site`, the public website, may use server rendering and static generation for SEO, but never holds children's data.
- The shared packages (`contracts`, `learning-core`, `game-sdk`, `ui-kit`, `i18n`, `mock-api`) stay framework-independent TypeScript.
- The development tools, the game sandbox and the UI preview, move to Next.js too (the human decided on 2026-10-26, over keeping them on Vite).
- The move is FRONTEND-KICKOFF step 1, reopened in sub-steps. Steps 2–14 keep their ticks for the Vite work they record.

## Consequences

- One framework for all three apps, and SEO for the website without a second stack.
- URLs with IDs move to the query string, such as the play route (`/play/hop-line-add-within-20` today) and the dashboard's child pages.
- ADR 0004, ADR 0024 and ADR 0041 are superseded where they name Vite-era tools. Their rules stand: ICU messages, an installable PWA that also serves MSW's worker, and suites that run on built apps.
- Revisit if a feature seems to need a server inside the frontend: that needs its own ADR, since the plan keeps the backend in Fastify.
