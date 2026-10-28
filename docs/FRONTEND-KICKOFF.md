# Frontend kickoff

Step-by-step build plan for the Learnofun **web frontend**. Claude Code works through it one step per session and ticks off progress below.

## For the human

Start Claude Code in the repository root and send:

> Read docs/FRONTEND-KICKOFF.md and do the next step.

Send the same message at the start of every new session. Claude will show you a plan and wait for your approval before it changes anything.

## For Claude: how to follow this file

1. **Do one step per session:** the first step in the progress list that is not ticked. If a step is too big for one session, split it into numbered sub-steps (for example 6a, 6b), add them to the progress list, and do the first one.
2. **Read first.** Read CLAUDE.md, the plan sections the step lists, and any earlier decisions in `docs/decisions/` that touch the step.
3. **Plan, then stop.** Before changing any file, show the plan: files and packages to create or change, new dependencies with a one-line reason each, the tests you will write, and any open questions. Wait for the human's approval.
4. **Build in small commits,** one concern per commit, with conventional commit messages.
5. **Prove it.** Run lint, typecheck and tests, and show the results. For UI work, also give the human the exact command or URL to see it. A step is only done when every "Done when" item is true.
6. **Close the step.** Tick it in the progress list with the date and a one-line note, commit that change, then stop. Tell the human what to check by hand and which step comes next.
7. **Ask instead of guessing.** If the plan does not decide something, ask. Record the answer as an ADR in `docs/decisions/` (copy `0000-template.md`).
8. **Stay inside the scope.** Never build `apps/api`, `apps/worker`, a database or any server code. All data comes from mock handlers that follow `packages/contracts`.
9. **Never weaken a check to pass it.** Do not loosen a test, lint rule, budget or simulator gate to make a step pass. Report the failure.

## Scope

- **Location:** all frontend code, config and the CI workflow live in `frontend/` (ADR 0003). Paths in this file are relative to it, and npm commands run there.
- **In scope:** `apps/web`, one app with the child app at `/` and the parent dashboard at `/parent` (ADR 0007; this replaced the separate `apps/play` and `apps/family` after step 3a), `packages/contracts`, `ui-kit`, `i18n`, `game-sdk`, `learning-core`, `mock-api`, `games/*`, `tools/game-sandbox`, `tools/simulator`; from step 18, `apps/site`, the landing site (ADR 0039).
- **Out of scope for now:** `apps/api`, `apps/worker`, `apps/studio`, the database, real authentication, real payments, native app stores. Steps 16 and 17 build sign-up, sign-in and payments on mock data only (ADR 0039).
- **Content:** maths for ages 6–8 first (plan section 10). Use simple placeholder shapes, not final art, and never draw known characters or brands.
- **Visual design:** `docs/design-system/` is the source of truth for colours, type, spacing, radius, shadows, voice and component look. Never invent values; if something is missing, ask.
- Every rule in CLAUDE.md and `.claude/rules/` applies.

## Progress

- [x] 0. Set the scope — 2026-10-20: CLAUDE.md points here; npm instead of pnpm (ADR 0002); frontend first, all mock data in one JSON file (ADR 0001); git deferred by the human, so nothing committed yet.
- [ ] 1. Scaffold the web monorepo — first done 2026-10-20 with React + Vite: npm workspaces + Turborepo in `frontend/`; two placeholder apps (merged into `apps/web` after step 3a, ADR 0007), six empty packages, boundary and purity lint rules, CI workflow; TypeScript pinned to 6.0 until typescript-eslint supports 7. Reopened 2026-10-26 for Next.js and Tailwind CSS (ADR 0042, ADR 0043): `apps/web` moves over in sub-steps, each planned and approved first; steps 2–14 keep their ticks for the Vite work they record. Not committed (no git yet).
  - Order approved 2026-10-26, so that every sub-step ends with every suite passing; run straight through, stopping only for decisions or failures. On 2026-10-26 1c–1e moved ahead of 1b, so the screen designs' look would arrive first; later that day the human held the designs for another review, so 1c–1e keep the current look (ADR 0044, amended):
  - [x] 1a. `apps/web` on Next.js, behaving as before: the App Router pages for both areas with IDs in the query string, the game shell and games as client components loaded with `next/dynamic` and `ssr: false`, MSW in the browser, a Serwist service worker in the static export, the development tools in test builds only; the existing CSS and translations kept for now; the web, PWA and conformance suites on the Next build — 2026-10-26: Next.js 16 with Turbopack, `output: 'export'`. `src/app` holds thin pages over the screens of `src/child` and `src/parent`; IDs moved to the query string (`/play?activity=`, `/parent/child/progress?id=`, `/play/dev?game=`, the last a page only with the development tools through `pageExtensions`), and `src/shared/navigation.tsx` keeps the screens' navigation calls. MSW and the translations start in a client-only module. The Serwist worker is built after the export with `@serwist/build` and esbuild (138 files precached), and `scripts/serve-static.mjs` serves exports as a static host does. `__DEV_TOOLS__` comes from `compiler.define`; the sign-in returns through `?next=`, and the saved-profile notice moved from router state to the tab's session storage. Seven browser checks met Next.js and were fixed at their cause (a query string appended twice, Next's empty route announcer, a faked back button, racing sign-out navigations, game bundles found by their message keys instead of Vite's file names, and the areas test reading every script the child area loads). Lint, typecheck and every unit test pass; Playwright web (110), conformance (136), sandbox (13) and each game (6) pass on the Next build; the UI preview, unchanged, still runs on Vite. Not committed (no git yet)
  - [x] 1c. Tailwind CSS v4: the theme and CSS variables generated from `tokens.json` with a test that they match exactly, Tailwind's defaults removed, the lint rules for arbitrary values, physical direction classes and classes outside the theme, class ordering, `packages/ui-kit` rebuilt with Tailwind, looking as before — 2026-10-26: `npm run tokens -w @learnofun/ui-kit` writes `theme.css` (an `@theme inline reference` block, so every utility points at a token's or a world role's variable and Tailwind's own values do not exist) and `theme-names.ts` for tailwind-merge; a test compiles the theme with Tailwind and checks both against `tokens.json`. ui-kit's `tailwind.css` adds the `play:` and `early-years:` variants, the worlds' durations and entrances, `shadow-with-focus-*`, `text-size-*` and the answer-tile classes DOM games share. Each app's one CSS entry layers ui-kit's base styles under Tailwind's utilities, without preflight for now; the apps' own CSS, still plain, stays unlayered. Every ui-kit component carries its utilities beside its `lf-` hooks, joined with `cn()` (clsx and tailwind-merge told the theme's names); all 16 component stylesheets are gone. ESLint checks classes in `className`, `cn()`, `clsx()` and variables named `*_CLASSES`: arbitrary values, physical directions and sizes, duplicates, conflicts, spliced class strings, and in ui-kit any class outside the theme; Prettier orders them. ui-kit's unit tests compare markup with only the `lf-` hooks kept (`src/test/markup.ts`). A pixel probe of the UI preview's 240 screenshots (every component, band, theme and direction) matched the pre-Tailwind baseline exactly, pixel for pixel; the probe was temporary and is deleted. Stylelint now skips Next's build folders, where Tailwind's compiled CSS lives. Lint, typecheck and every unit test pass; Playwright UI preview (389), web (110), conformance (136), sandbox (13) and each game (6) pass. Not committed (no git yet)
  - [x] 1d. The child and parent screens and the game shell on Tailwind, looking as they do now; the screen designs wait for the human's review (ADR 0044, amended) — 2026-10-26: the web app's three stylesheets (child area, game shell, parent dashboard; about 800 lines) are gone, and its screens carry Tailwind utilities, with shared lists in `src/shared/page-classes.ts` and `src/parent/classes.ts`. The sizes the app chose (the 232px activity card, the card grid, the placeholder shape, the profile buttons, the game bar's progress, the Family page width, the wordmark's weight) are world roles in ui-kit's `worlds.css`, so they are theme utilities, not arbitrary values. The game bar's phone layout places its parts on grid lines instead of named areas. The lint for classes outside the theme now covers `apps/web/src`, besides four hooks the tests use (`parent-field__error`, `parent-skills__skill`, `parent-reasons__card`, `parent-session`). Preflight stays off, so nothing else moves. A temporary pixel probe of 113 screenshots (every screen and several states, desktop and phone, left to right and right to left) matched the pre-Tailwind baseline exactly, except two places where the old CSS fell short of its own rules, now fixed: the strand and session labels take `family-label`'s 0.06em letter spacing, and an invalid text field shows its danger edge, as menus already did. The grown-up settings dialog on Today, the time-up message and the loading and error states were not in the probe. Lint, typecheck and every unit test pass; Playwright web (110), UI preview (389), conformance (136), sandbox (13) and each game (6) pass. Not committed
  - [x] 1e. The games' DOM on Tailwind, looking as it does now (ADR 0044, amended) — 2026-10-26: the four games' stylesheets are gone, and `create-game`'s template with them. Each game names its classes in `*_CLASSES` constants, Tailwind utilities beside its `g-` hooks, and picks them as it renders each state. The drawings' widths, dashes and text sizes, in each scene's own units, are SVG attributes or Tailwind's numeric `stroke-*`. The sizes the games chose (the number line's and the trays' widths, Tile Farm's field and wide layout, the scenes' heights on short screens, Hop Line's footprints) are world roles in `worlds.css`, and Tile Farm's wide landscape layout uses a new `wide:` breakpoint at its 40rem; the theme also gains each type style's line height (`leading-read-story`) and the numerals' weight (`font-number`). The games' mechanics, controls and drivers are unchanged. The lint for classes outside the theme now covers the games, besides their `g-` and `lf-` hooks. A temporary pixel probe of 288 screenshots in the built sandbox (every story's items, desktop, tablet and phone, both directions, high contrast, after a wrong answer, and Ten Frame Café's and Tile Farm's hints) matched the baseline exactly; Hop Line's and Demo Choice's hints were converted before the probe had them. Lint, typecheck and every unit test pass; Playwright web (110), UI preview (389; one test failed once under load and passed on its own), conformance (136), sandbox (13) and each game (6) pass. Not committed
  - [x] 1b. The UI preview and the game sandbox on Next.js too (decided 2026-10-26), behaving as before — 2026-10-26: both are Next.js static exports like the web app, each one client-only page with its setup in the address, on the same ports (5175 and 5176 in development; their builds on 4175 and 4176 through `scripts/serve-static.mjs`, whose last `--port` now wins, so the games' suites keep their own ports). No development indicator, so screenshots of the development server show only the tool. Their own stylesheets are Tailwind utilities: type sizes from the design system (the sandbox's two titles, 20px and 18px, are now `family-heading`), and the tools' layout sizes as world roles, with a `desktop:` breakpoint at the sandbox's 60rem. `font-inherit` is written in longhands, so a size or weight beside it wins. Live reload on the development server: Fast Refresh patched a game's code in place, so `src/live-reload.ts`, loaded only there, imports every game and the packages they run on, and reloads the page when any of them changes, restarting the session; checked for a game, `game-sdk` and `learning-core`. Temporary pixel probes matched the Vite builds exactly: the UI preview's 244 screenshots, and the sandbox's 187 besides its titles. The Docker screenshot suite waits for Docker (1g). Lint, typecheck and every unit test pass; Playwright UI preview (389), web (110), conformance (136), sandbox (13) and each game (6) pass. Not committed
  - [x] 1f. next-intl, with `use-intl` in `packages/ui-kit` so every app shares it, and both pseudo-locales; i18next removed — 2026-10-27: use-intl 4, next-intl's core, replaces i18next, i18next-icu and react-i18next. `packages/i18n` makes the translator with use-intl's framework-free core: `createI18n` gives `t`, `has`, the locale, `changeLocale`, `onLocaleChange` and use-intl's settings, every locale on the English catalog, a missing key shown and reported, and messages it cannot format reported. `packages/ui-kit`'s `I18nProvider` is use-intl's provider, and `useI18n` translates with use-intl's hook, keeping its shape, so no screen changed; `translate`, for games' keys, still follows the locale without changing. Both pseudo-locales change the text after formatting, as before. `apps/web` takes no next-intl package of its own: as a static export of client components it uses none of next-intl's routing or server rendering, so `apps/site` adds it for its server-rendered pages (ADR 0042). The conformance suite checks games' strings with `has`. Lint, typecheck and every unit test pass; Playwright web (110; one test failed once under load and passed on its own), UI preview (389), conformance (136), sandbox (13) and each game (6) pass. Not committed
  - [ ] 1g. `next/font` with local files, the last Vite pieces removed, CI, the screenshot tests and CLAUDE.md's commands — 2026-10-27, all but the screenshot tests, which wait for Docker Desktop: the fonts load with next/font from the Fontsource files (`npm run fonts -w @learnofun/ui-kit` writes each app's `src/app/fonts.ts`), each family under its own name, only Latin preloaded, with next/font's sized fallback in the tokens' stacks; the service worker precaches the fonts by their new names. The conformance suite measures game bundles with esbuild. The games, the registry, conformance and `create-game`'s template no longer carry Vite's types or package (Vitest keeps its own). `@types/node` is declared where tsconfigs use it. The workflow moved to `.github/` at the repository's root, running in `frontend/` (ADR 0003). CLAUDE.md lists the tokens and fonts commands. Lint, typecheck and every unit test pass; Playwright web (110), UI preview (389), conformance (136), sandbox (13) and each game (6) pass. Not committed
- [x] 2. Internationalization — 2026-10-20: i18next + ICU in `packages/i18n` (ADR 0004), React binding in `ui-kit`, en-XA and en-XB pseudo-locales with a dev-only Language menu, JSX-text and logical-CSS lint rules. Not committed (no git yet). Built with i18next on Vite; moves to next-intl in step 1c (ADR 0042).
- [x] 3. Design tokens and UI kit (split into 3a–3e; each must pass the step's "Done when" for its components) — 3a–3c done 2026-10-20 on draft tokens; reopened 2026-10-21 for the design system (`docs/design-system/`, ADR 0019) as 3d and 3e; done again 2026-10-21. Built as plain CSS on the token properties; moves to Tailwind in step 1b (ADR 0043).
  - [x] 3a. Tokens, colour and band themes, `tools/ui-preview` with accessibility and screenshot tests; Button and Card — 2026-10-20: draft tokens, light/dark/high-contrast and `early-years`/`early-primary` themes (ADR 0005), 54 WCAG 2.2 AA checks, 36 Docker screenshots (ADR 0006), reduced-motion tests. Not committed (no git yet).
  - [x] 3b. AvatarPicker, ProgressStrip, Dialog, Toast, FeedbackOverlay — 2026-10-20: all five with previews; 189 WCAG 2.2 AA checks, 126 Docker screenshots (now the whole viewport), 11 behaviour tests (dialog focus and Escape, toast timing, arrow keys, progress text, burst under reduced motion). Not committed (no git yet).
  - [x] 3c. ParentalGate and SettingsPanel, including the dyslexia-friendly font — 2026-10-20: times-table gate in words and PIN gate (ADR 0008), settings panel with Switch, text size and Andika; 243 WCAG 2.2 AA checks, 171 screenshots, 21 behaviour tests. Not committed (no git yet).
  - [x] 3d. Design-system tokens, fonts and themes: CSS generated from `tokens.json` with a test that it matches, Baloo 2, Andika and Readex Pro self-hosted, themes and bands as the README says, every stylesheet on the design-system tokens — 2026-10-21: done, with the phone layout for the game shell (ADR 0019). Not committed (no git yet).
  - [x] 3e. Design-system components: Button, AnswerTile, ActivityCard, Feedback, ProgressTrail and SkillStatus; AvatarPicker, ParentalGate, Dialog and SettingsPanel restyled; Phosphor icons; used in the game shell, Today and the demo game. Built in five parts (ADRs 0019–0021): 1. icons and Button, with the other four restyled; 2. Feedback, Celebration and ProgressTrail in the game shell; 3. AnswerTile in the demo game and template; 4. ActivityCard on Today and in the Library; 5. SkillStatus — 2026-10-21: all five done; 1,011 unit tests, 511 Playwright tests and 254 Docker screenshots (every component in each band, theme, English and right to left, and at 150% text in Andika). Not committed (no git yet).
- [x] 4. Contracts — 2026-10-20: Zod schemas for family, child, settings, goals, skills and graph, activities, game manifest, the eight item types and answers, 11 learning events, session, skill state, recommendations and entitlements; readable content IDs (ADR 0009), child profile fields (ADR 0010); 130 tests. Not committed (no git yet).
- [x] 5. Mock API and fixtures — 2026-10-20: MSW handlers for eight endpoints on MSW's service worker, in every build until a backend exists (ADR 0011); all mock data in `packages/mock-api/src/data/mock-data.json`; slow, offline and server-error modes from a dev panel; state saved in the browser. Not committed (no git yet). Built on Vite; MSW moves into the static export in step 1d.
- [x] 6. Game SDK and session engine — 2026-10-20: done as 6a (learning-core: seeded random, UUIDv7, graders for choice, audio-choice, numeric and placement, placeholder policy, pure session engine) and 6b (game-sdk: contract and `runSession`); a headless full-session test with exact events, reproducible from the seed. Not committed (no git yet).
- [x] 7. Game shell, sandbox and conformance suite (split into 7a–7d) — 2026-10-20: all four parts done; the demo game made with `create-game` runs in the sandbox and the shell and passes the conformance suite. Built on Vite; the shell and the sandbox's games move to client components in step 1e.
  - [x] 7a. `create-game` command, game registry and the `demo-choice` reference game — 2026-10-20: templates in `tools/create-game`, `@learnofun/game-registry`, `ctx.localize` for content text; decisions on leaving games and screen sizes (ADR 0012). Not committed (no git yet).
  - [x] 7b. `tools/game-sandbox` — 2026-10-20: any registered game, story or single item, band, locale, theme and setting, kept in the URL; the real session runner with pause, resume, skip and end; a learning-event log checked against the contracts, and a problems list for undeclared strings and signals; live reload. `createTranslate` in `@learnofun/i18n` for games' message keys. Not committed (no git yet).
  - [x] 7c. Game shell in the child area — 2026-10-20: progress strip, hint button (one hint per item, ADR 0013), shared feedback and celebration, pause menu with "back to my games" and settings behind the parental gate, pause on backgrounding, error screen; play settings shared across the child area; `/play/dev/:gameId` in development builds, with events kept in the page until step 8. Not committed (no git yet).
  - [x] 7d. Conformance suite, at 1024×600, 768×1024 and 360×640 (ADR 0012) — 2026-10-20: `tools/conformance` (`npm run conformance`): static checks, a 1,500,000-byte bundle budget, and 17 browser checks per story in the shell and the sandbox, played with each game's keyboard driver (ADR 0014); shown to catch five deliberate faults, and passed by a freshly scaffolded game. Not committed (no git yet).
- [ ] 8. First game: Hop Line (brief approved 2026-10-21; split into 8a–8c; its play route moves to Next.js in step 1e)
  - [x] 8a. Item templates and the Hop Line content — 2026-10-21: `ItemTemplate` and line-placement `start`, `labelEvery` and `misconceptions` in contracts; seeded generators in learning-core (ADR 0015), with property tests over a thousand seeds each (`fast-check`); the `hop-line-addition` template and four misconceptions in the mock catalog. Not committed (no git yet).
  - [x] 8b. The Hop Line game, to the approved brief, passing the conformance suite — 2026-10-21: SVG number line with a placeholder frog; Hop, Back and Land, arrow keys and a screen-reader slider; hop counter, footprints hint, worked "show me" and the four misconception explanations; Challenge mode; `ctx.mode` and `ctx.formatNumber` for games (ADR 0016); a Mode setting in the sandbox; 6 Hop Line tests of its own and all 17 conformance checks. Not committed (no git yet).
  - [ ] 8c. `/play/:activityId` against the mock API, and a tablet play-through by the human — 2026-10-21: built; waiting for the human's tablet play-through. `/play/:activityId` generates six items from the activity's template (eight since 9b: two warm-ups and six, ADR 0022) and sends its session and events to the mock API (`session-sync.ts`); `npm run dev:lan` for tablets, with the mock API answering from inside the page where there is no service worker (ADR 0017). Not committed (no git yet).
- [ ] 9. Child app flows (split into 9a–9d) — done 2026-10-22; the step's "Done when" is shown in 9c. Reopened 2026-10-26 for what the screen designs add (ADR 0044). Built on Vite; the PWA moves to Serwist and the static export in step 1d.
  - [x] 9a. Child mode: profile picker with an optional picture PIN, Today, the activity library, and the way into `/parent` through the gate (ADR 0018) — 2026-10-21: `/` who's playing, with picture PINs checked by the API; `/today` and `/library` showing only playable activities; grown-ups' settings and the picture PIN behind the gate; the chosen child remembered on the device and their settings saved to the mock API; `PicturePinPad` in ui-kit. PIN pad screenshots added with step 3e's. Not committed (no git yet).
  - [x] 9b. Session shape (warm-up, core block, ending on a success), daily time limit and break reminder — 2026-10-21: a session plan in learning-core (two warm-ups, a core block of 4 or 6 by band, easy `ending` items so it ends on a success) in the placeholder policy, now `placeholder-2`; the parent's session minutes and the daily limit wrap a session up after its item, the limit with the `time-limit` reason; today's play as a mock API projection of the events; "That's all for today" on Today, the library and the play route, and one more session today behind the gate; the "Time for a stretch" reminder before the next item (ADR 0022). 1,075 unit tests and 516 Playwright tests pass. Not committed (no git yet).
  - [x] 9c. Offline event queue in IndexedDB with backoff, and resuming a session after a refresh (the step's "Done when") — 2026-10-21: an outbox in IndexedDB for sessions, events and settings, sent in order and in batches, retrying from 1 second to a minute and at once on reconnecting; a running session saved after every event and every 5 seconds, carried on paused on the same item when the activity opens again within 24 hours, and ended as `expired` after that; `session-sync.ts` removed (ADR 0023). Playwright shows a session with the network off midway reaching the mock API once, in an unbroken sequence, and a refresh mid-session carrying on. 1,088 unit tests and 520 Playwright tests pass. Not committed (no git yet).
  - [x] 9d. Installable PWA, its service worker combined with MSW's — 2026-10-22: `vite-plugin-pwa` 2.0 with our own worker (`src/sw/sw.ts`), precaching the whole build (shell, every game's bundle, styles, Latin fonts), importing MSW's worker in mock builds; a new version waits for the next launch; placeholder icons (a sun disc on navy, from the tokens) and a manifest in the tokens' colours; the child area keeps its last data from the API for offline use (ADR 0024). Playwright, against a production build, shows it installable and opening and playing with no network. 1,092 unit tests and 523 Playwright tests pass. Not committed (no git yet).
  - [ ] 9e. What the child-app designs add (ADR 0044; waits until the human asks for the designs' screens, since 2026-10-27): Today as the day's path, with the next activity's card; the library's categories and each game's stars from skill growth; stickers for finished sessions and the My stickers screen; the designs' Paused, You did it and Stretch break screens
- [ ] 10. Parent dashboard (split into 10a–10e; ADR 0025) — done 2026-10-22; the step's "Done when" is shown in 10e. Reopened 2026-10-26 for what the screen designs add (ADR 0044).
  - [x] 10a. Mock sign-in at `/parent/login`, the dashboard frame with the family switcher, and the plan view by feature key — 2026-10-22: the mock API keeps who is signed in; Sam belongs to Sam's free family (Robin, Ari) and Alex's premium one (Nia), Alex to one; every family endpoint answers 401 signed out and 404 for another family, with cross-tenant tests; signed out, every dashboard page goes to the sign-in and back after it; the switcher's choice remembered on the device, and ignored for an account outside that family; `/parent/plan` reads the feature keys; a catalog test keeps every `parent.*` string in growth language. 1,181 unit tests and 531 Playwright tests pass. Not committed (no git yet).
  - [x] 10b. Child profiles: create and edit nickname, birth year and month, learning language and optional grade (ADR 0026) — 2026-10-22: "Add a child" and "Edit profile" in the dashboard, for owners and guardians (caregivers are refused, through one policy module in the mock API); birth month and year as two menus, for ages 3 to 8 in the family's time zone (`ageInMonth`), and a child past 8 can still be renamed; learning languages, default curriculum and a draft GB grade scheme as market configuration (`GET /api/markets/:market`); at `children.max`, "Add a child" is unavailable and says why, with the way to the plan; another family's child is not found, with cross-tenant tests; month and language names from `Intl`, pseudo-localized like content. 1,328 unit tests and 540 Playwright tests pass. Not committed (no git yet).
  - [x] 10c. Goals, subject balance, session length and daily limits (ADR 0027) — 2026-10-22: a "Goals and time" page per child, each part saved on its own by an owner or guardian; a goal is a subject focus, one at a time, and on premium (`goals.custom`) also a skill and an end date; a child's subjects come from the market's experience bands (maths from 3, maths and literacy from 6), with draft early-English skills in the mock skill graph; the balance in 10% steps adding up to 100, 0% pausing a subject; time limits from set steps, a session never longer than the day; the device's settings endpoint now saves only what child mode edits, so a tablet never undoes a parent's limits; signed out, `GET /api/parent/session` answers with no session instead of a 401. 1,465 unit tests and 549 Playwright tests pass. Not committed (no git yet).
  - [x] 10d. Fixture session scripts played into events; progress by skill with "early signal" from them, by `insights.detail`; and explanations from reason codes in growth language (ADR 0028) — 2026-10-22: 20 past sessions as scripts, played through the real session engine with generated number items into sessions and events when the mock API starts; `skillEvidence` in learning-core counts first-try, unaided answers, graded again, with "early signal" below 8 on 6 items; a test holds every strong, mastered or review-due fixture status to that minimum, so three of Robin's statuses that no activity could have backed went, and Nia gained the two her Today cards imply; template items rebuild from their IDs (`itemFromId`), so a session played on the device counts too; a "Progress" page per child, every skill with its evidence on premium and a summary per strand on the free plan; Today's explanations from reason codes with counts from the same events, the nickname and no pronouns; strands named in the skill graph; saved mock state from an older data file starts afresh. 1,560 unit tests and 559 Playwright tests pass. Not committed (no git yet).
  - [x] 10e. Session history by plan 5.2's definitions, from the session scripts' events (the step's "Done when"; ADR 0029) — 2026-10-22: `sessionMeasures` in learning-core works out plan 5.2's measures from one session's events, answers graded again: items presented, attempted, skipped and not answered; first-try accuracy, eventual success, supported, learning credit; time on task without pauses or idle gaps over 30 seconds; and the status, from the session's end events and the time now; a "Sessions" page per child, by week, newest first, as counts and never a score; every measure and each session question by question on premium, the headline on the free plan. The step's "Done when": every number on the dashboard comes from the events (counts, history) or from fixtures (ages, plans, goals and limits, statuses, each backed by its scripts); a catalog test keeps every parent string clear of weak, failing, behind and slow, and the progress pages are checked in the browser too; every dashboard page meets WCAG 2.2 AA, light and dark. 1,658 unit tests and 567 Playwright tests pass. Not committed (no git yet).
  - [ ] 10f. What the dashboard designs add (ADR 0044; waits until the human asks for the designs' screens, since 2026-10-27): the sidebar with the children; the overview's week and charts; the progress page's growth over 8 weeks; the skill map; the activity page with its CSV download; play-time windows and hidden games in goals and limits; grown-up invites and devices in Family; notifications, accessibility and data in Settings
- [x] 11. Learning core: graders and evidence weights (ADR 0030) — 2026-10-22: graders for match and sort (partial credit in the score, never in mastery), sequence (positional or adjacency), build and spell (accepted spellings, exactly, after Unicode normalisation) and program (a small simulator: a bump ends the run, right only on the goal, within the allowed commands and limit, and every run ends); plan 5.3's evidence weights in a typed config (`answerWeight`, `observations`), the smallest applying rule winning; `skillEvidence` builds on them, with early signal below 8 full-weight observations on 6 items, the counts parents see unchanged. Property tests prove later attempts and repeats within 14 days never add evidence, and fail when either rule is broken. 1,688 unit tests pass; the web (108), conformance (51), sandbox (13) and Hop Line (6) Playwright suites pass. Not committed (no git yet).
- [x] 12. Learning core: learner model, mastery gate and simulator (ADR 0031) — 2026-10-22: plan 4.1's Elo-style ability with uncertainty, weighted by the evidence of step 11, in `learning-core` (`skillState`), with the full mastery gate, statuses before it by predicted success, and the review ladder of 3, 7, 21 and 60 days, every number a starting default in config; golden scenarios pin the decisions, checked against an independent calculation; `tools/simulator` and `npm run sim` (in CI): 2,000 seeded synthetic learners through the real engine, policy and model, false mastery 0.5% (required, under 5%), and a careless gate shown to fail it; the policy gates reported for step 13: success zone 20.4% (the placeholder takes items in order), scaffold loops 0%, error streaks 0.20 a session. The mock API now computes every child's skill states from the events; the fixture statuses are gone, and the scripts were tuned (reviews included) so each child keeps the statuses meant, checked by a test on a fixed date. 1,726 unit tests pass; Playwright web (108), conformance (51), sandbox (13) and Hop Line (6) pass. Not committed (no git yet).
- [ ] 13. Learning core: in-session policy and planner (split into 13a–13d; ADR 0032, ADR 0033)
  - [x] 13a. Plan 4.2's in-session policy, items made on demand — 2026-10-22: `createAdaptivePolicy` (`adaptive-1`) in `learning-core`, every number in a typed config. It warms up and ends at an easy level, aims the core block at the success zone for the mode and band from the child's ability, changes difficulty on windows (DIFFICULTY_STEP), puts in a scaffold after 2 supported items and then a bridge, asks a missed item again once 2–3 items later, ends on an easy success when first tries stay low after scaffolding (LOOP_GUARD), and offers a break once when the child drifts. A fixed list still plays in order. The engine makes items on demand from an `ItemMaker` (`templateMaker` for templates), keeps the history and the child's ability up to date within the session, and saves the items made so far. Unit tests for every rule, three golden scenarios worked out by hand, and properties shown to catch two deliberate breakages. The simulator now plays the new policy: false mastery 0.0%, scaffold loops 0.0% and error streaks 0.03 a session, all required. The success zone, 31.0% of core-block targets against 70%, is reported as failing: the learner model falls behind children who are learning (ADR 0033), so 13b rebuilds it. Lint and typecheck pass; 1,766 unit tests pass; Playwright web (108), conformance (51), sandbox (13), Hop Line (6) and UI preview (389) pass, two of them after one rerun each (see step 15). Not committed (no git yet).
  - [x] 13b. A learner model that follows a child who is learning, so the simulator's success-zone gate passes and becomes required (ADR 0033); if no sound model reaches it, the target goes to a learning designer — 2026-10-23 (ADR 0034): exact Bayes, the best possible estimate, reaches only 64.7% of targets from a first session, so the 70% target went to a learning designer and the gate stays reported. The model is now `elo-2`: K from the information each answer carries, σ widening with practice and days away, and Mastered judged on θ − σ. Expected learning was tried and dropped, since it invented mastery for children who do not learn. The gates now run over fast, slow and non-learning children (2,000 each), and every required gate passes for all three: false mastery 0.0%, 0.5% and 1.8%, scaffold loops 0.0%, error streaks 0.02–0.04; targets in the zone 32.6%, 56.1% and 63.6% (reported). The golden values were worked out apart from the code and pinned. The mock scripts give each mastered skill several sessions of evidence (Robin 21 sessions, Nia 8), and every child keeps its intended statuses and review dates. 1,770 unit tests pass; Playwright web (108), conformance (51), sandbox (13), Hop Line (6) and UI preview (389) pass. Not committed (no git yet).
  - [x] 13c. Plan 4.3's planner for Today, playable activities only, a favourite for "Your choice", reason codes to the dashboard — 2026-10-23 (ADR 0035): `planToday` (`planner-1`) in `learning-core` gathers reviews due, skills being built, frontier skills and prerequisites of skills that stayed hard, scores them with goals, the subject balance, variety, recency and favourites, and fills a review card (else a skill still building), a new card and "Your choice" (the activity finished most in 14 days), each its own playable activity. The mock API plans Today from the events on every request, so it changes after each session (a test shows Nia's review card moving on once she does it on a device); the fixture cards are gone. The catalog's release lists its games (Hop Line), and the planner and the app play only those, with a template to make items from: one card per child until more activities exist. `TodayResponse` takes up to three cards, one of each kind, no activity twice. The dashboard words a first skill with no prerequisite. Properties catch an activity put on two cards. Lint, typecheck and 1,792 unit tests pass; Playwright web (108) passes. Not committed (no git yet).
  - [ ] 13d. The play route on the new policy; Hop Line adapting when played by hand; Today changing after sessions (the step's "Done when") — built 2026-10-23 (ADR 0036), waiting for the human's play-through. The play route plays catalog activities on `adaptive-1`, with items made on demand from their template and the child's ability on the skill Today's card names (`?skill=`). Game stories, the sandbox and the conformance suite keep the placeholder. An offered break shows the break screen with its own words. A scripted browser session against the dev server shows the adaptation: Robin's targets cross ten where Ari's stay under ten; after four right the line drops its labels; after two missed targets come a scaffold, a bridge, the re-ask and the target again. Today changing after a session is tested in the mock API. Lint, typecheck and 1,798 unit tests pass; Playwright web (108, one first-load flake passing on rerun), conformance (51), sandbox (13), Hop Line (6) and UI preview (389). Not committed (no git yet).
- [x] 14. Games two and three: Ten Frame Café and Tile Farm — done 2026-10-23: both pass the conformance suite in the shell and the sandbox; the café's activities are on Robin's and Ari's Today, and Tile Farm's on Nia's (arrays new, equal groups "Your choice"; a mock API test, since Nia's family is not on this device) and in the library; `add-within-20` is reachable from Hop Line and the café.
  - [x] Ten Frame Café brief — 2026-10-23: approved as drafted (Add and Take away taps, ages 6–8 first, making ten also counting for `add-within-20`, five misconceptions); now the game's `BRIEF.md`, with two build notes: bonds to 10 spill extra fruit onto the counter (approved), and making ten counts on from the full tray
  - [x] 14a. The ten-frame scene on numeric items, numeric misconceptions, and the café's three templates in the contracts (ADR 0037)
  - [x] 14b. The café's generators in `learning-core`, with IDs that rebuild their items; `levelItems`, `generateItem`, `templateMaker` and `itemFromId` for every generator, building only the item chosen; the numeric grader naming misconceptions. Properties shown to catch a broken misconception lookup
  - [x] 14c. The café's templates and misconceptions in the mock catalog, difficulties set around each skill's mastery difficulty; making ten also giving evidence for `add-within-20`, so it can be mastered from two games (a mock API test credits it from a café session). Lint, typecheck and 1,821 unit tests pass; learning-core's CPU-bound properties get a 20-second limit for the parallel run. Not committed (no git yet)
  - [x] 14d. The Ten Frame Café game with placeholder shapes, in the release; its sandbox stories, conformance driver and tests; Today with the café's cards — 2026-10-23: `@learnofun/game-ten-frame-cafe`, scaffolded by `create-game`. Trays drawn in SVG, Add, Take away and Serve (Move one and Move back in making ten), one keyboard control, the hint, the worked "show me", the five misconceptions, Practice and Challenge; one story per activity. The café is in the release, so every child's Today has three cards again (Robin: the bonds-to-10 review, bonds to 20, and Hop Line as "Your choice"), and Nia's adding within 20 comes from the café. Conformance passes for both games (102), the café's own browser tests (6), web (108), sandbox (13), Hop Line (6) and UI preview (389, one flake passing on rerun); lint, typecheck and every unit test pass. The human's dev server needed a restart to find the new package. Not committed (no git yet)
  - [x] Tile Farm brief — 2026-10-23: approved as drafted (a row per tap, counting by rows and by ones, both activities now, four misconceptions); now the game's `BRIEF.md`, with build notes: the counter never stops at the plants in the field, arrays stop planting at a full outline, and arrays count for the times tables only in rows of 2, 5 and 10
  - [x] Tile Farm: its build — 2026-10-23 (ADR 0038). The field scene and Tile Farm's two templates in the contracts, with `timesTables` so that only rows of 2, 5 and 10 give evidence for `multiply-by-2-5-10` (the brief); the generators in `learning-core`, with the four misconceptions and IDs that rebuild their items, under unit tests and properties; the templates and misconceptions in the mock catalog, levels around each skill's mastery difficulty. Then `@learnofun/game-tile-farm`, scaffolded by `create-game`: the field in SVG, Plant a row and Dig up a row, a counter that starts at nothing with Add a row, Add one and Take one, and Done; ticks on counted rows, the running-totals hint, the worked "show me", the four misconceptions, Challenge without Add a row; one story per activity. On wide, short screens the field sits beside the controls; on phones the instructions are one line, so the long and right-to-left pseudo-locales fit 360×640. In the release, Nia's Today moves on to arrays, since her repeated addition is strong, and the free family's library gains equal groups; arrays stay premium. A browser test plays it from the library against the mock API. Lint, typecheck and 2,021 unit tests pass; Playwright conformance (136), Tile Farm (6), café (6), Hop Line (6), sandbox (13), web (109) and UI preview (389). The web suite ran on a fresh server: the human's dev server needs a restart to find the new package. Not committed (no git yet)
- [ ] 15. Frontend hardening (split into 15a–15h, approved 2026-10-23)
  - [x] 15a. The slow first loads in the Playwright suites: find the cause and fix it, without raising timeouts — 2026-10-23 (ADR 0041). Neither suspect: a cold server added about 0.3 s, and Vite never bundled again mid-run. The development server serves about 120 modules in a chain, about 1.3 s a page, and contention stretches it: with the conformance suite alongside, 2 of 48 sandbox loads passed 5 s. Built apps load in about 0.6 s and barely slow under the same load. Every suite now builds what it tests and serves it on a port of its own, never reusing a running server: the web app's test build (`build:e2e`, with the development tools behind `__DEV_TOOLS__`, which production leaves out entirely), the built sandbox and the built UI preview. A production-build test checks the tools are absent; the areas test now finds parent-area code through the build's manifest and a parent-only marker. Every suite passes, faster (web 110 in 2.5 min, was 5.7; conformance 136 in 4.1, was 6.9; UI preview 389 in 4.2, was 5.5; sandbox 13; each game 6), and the web and sandbox suites pass with six busy threads beside them. Not committed (no git yet)
  - [x] 15b. One collapsed development panel for the Language menu and the mock API controls — 2026-10-27: "Developer tools", a `<details>` panel in the corner (bottom, at the start side) that stays closed until opened and remembers it for the tab, so a mock setting's reload keeps it open; it holds the Language menu and, while the mock is on, the mock API controls, and is absent from production builds (ADR 0041). The same day the designs' icons replaced Phosphor (ADR 0045). Lint, typecheck and unit tests pass; Playwright web (110), conformance (136), UI preview (389; 4 that failed while a design-rendering job shared the machine passed alone), sandbox (13) and each game (6). Not committed
  - [x] 15c. Screen layouts from the Cover's composition, as phone and tablet screenshots on a private review page, for the human's approval; then an ADR — 2026-10-26: replaced by the human's own screen designs in `learnofun-design/` (ADR 0044)
  - [ ] 15d. The screen designs, built after the human's review, checked on every screen; the screenshot tests checked against the built preview in Docker, then moved to it (ADR 0041) — waits: on 2026-10-27 the human took the designs' colours, type and icons now (ADR 0045) and asked for their screens later; their four answers for then are in ADR 0044
  - [x] 15e. The accessibility pass: keyboard-only and switch-style walkthroughs of every screen, accessibility-tree tests, axe in all three locales, and an NVDA or VoiceOver checklist for the human (who listens, since Claude cannot) — 2026-10-27: `apps/web/e2e/accessibility.e2e.ts` covers the 17 screens in `e2e/screens.ts`, plus the stretch reminder, the celebration and the day's end. The screens are the picker, the picture PIN, the gate, Today, the library, the grown-ups' settings, a game, the pause menu, the game's settings, and the dashboard's sign-in, overview, profile, adding a child, goals and time, progress, sessions and plan. Each meets WCAG 2.2 AA with axe in en, en-XA and en-XB, and in the dark and high-contrast themes. Each has a structure a screen reader can use: the page's language and direction, one main landmark, one top heading, no skipped levels, named dialogs, and landmarks told apart. Tab reaches every control once, in order, with its focus ring, in view and not covered. A child plays, and a grown-up signs in and opens a profile, with only a switch's two actions. Found and fixed: the game screen and the play route's "That's all for today" had no top heading; the shell now has the activity's name as a hidden heading and as the page title. `docs/screen-reader-checklist.md` is for the human. Not committed
  - [x] 15f. The right-to-left pass on every screen — 2026-10-27: `apps/web/e2e/rtl.e2e.ts` checks every screen in en-XB, and in en-XA for long text, on a phone (360×640), a tablet (768×1024) and a desktop (1280×800). The page never scrolls sideways. No text is cut off without an ellipsis. The icons that point along the line turn round right to left, and only then. Every row of the app's own layout reads from the inline start; games' scenes keep their own direction and are checked by the conformance suite. A test shows the checks catch a row running the wrong way and a page that scrolls sideways. Every screen passed. Not committed
  - [ ] 15g. Performance budgets in CI (ADR 0040): every screen under 3 s on a throttled mid-range profile, bundle sizes at their size on the day plus 10%, and no development chunk in a production build (ADR 0041) — built 2026-10-27, failing on load time, waiting for the human. `apps/web/e2e/performance.e2e.ts`, the web suite's `performance` project, runs against the production build after the other projects, one test at a time, with the preview server now gzipping text as a static host does. Two checks pass. The bundle caps are set from the day's sizes plus 10%, in `e2e/budgets.ts` and ADR 0040's record. The production build holds no development code. Load time fails: first visits take 7.8–9.7 s and signed-in dashboard pages 2.8–4.0 s on slow 4G with the CPU 4× slower. Nothing paints until the mock API has replayed its scripted sessions, about 1.5 s at 4× CPU. On slow 4G the 379 KB of scripts, about 160 KB of them the mock, alone take more than 3 s to arrive (ADR 0040). The budget is unchanged. Speed-ups the same day brought the picker to 6.7 s and the other first visits to 8.0–9.3 s: only Baloo 2 is preloaded, the mock data is checked by a unit test instead of on every load, and the service worker installs while the mock downloads. The rest is mostly the mock API working in the page (ADR 0040's record). Left failing by the human's choice on 2026-10-28. Not committed
  - [ ] 15h. `docs/FRONTEND-STATUS.md`, for the human's review — written 2026-10-27: what is done, what is mocked, the endpoints and guarantees a backend must provide, and what waits on the human; waiting for the human's review
- [ ] 16. Accounts: sign-up, sign-in and onboarding (ADR 0039), as the Signup screens and the website's Log in show them (ADR 0044). Split into 16a–16b on 2026-10-28 (ADR 0046)
  - [x] 16a. The contracts and the mock API — 2026-10-28 (ADR 0046):
    - sign-in links, sent once and working for 15 minutes;
    - signing in with a link, a passkey, Google or Apple (mocked), or a demo account;
    - sign-up, creating the account and a free-plan family with the new parent as owner;
    - consent as a ticked declaration to the market's current privacy policy, needed before a child is added;
    - handing the device to a family, whose children the profile picker then shows;
    - the market list.

    Each endpoint has unit tests and cross-tenant tests. The data file's families have consented. Not committed
  - [ ] 16b. The pages: sign-up, the sign-in with each method, onboarding (consent, first child, goal, hand-over) and adding a passkey — waits: on 2026-10-28 the human asked for no page to be created or changed until they say so, once the designs are updated
- [ ] 17. Plans and payments, with a test checkout (ADR 0039), as the dashboard's Plan and billing and the website's Pricing show them (ADR 0044)
- [ ] 18. The landing site (ADR 0039), as the website screens show it (ADR 0044)
- [ ] 19. The launch games (ADR 0039)

---

## Steps

### 0. Set the scope

**Read:** CLAUDE.md; plan sections Summary, 2 and 10.

**Do:**
- Check that `docs/plan.md`, `docs/game-library.md`, `docs/design-system/README.md` and `docs/design-system/tokens.json` exist. If any is missing, stop and tell the human.
- In CLAUDE.md, under "Source of truth", add: `Design system: docs/design-system/README.md and tokens.json. Use its tokens by name; never invent colours, fonts or sizes.`
- In CLAUDE.md, replace the line under "Current phase" with: `Web frontend only. Follow docs/FRONTEND-KICKOFF.md. Do not build apps/api, apps/worker or a database; all data comes from mock handlers that follow packages/contracts.`
- In CLAUDE.md, change the "First sessions and prompts" pointer to `docs/FRONTEND-KICKOFF.md`.
- Initialise git if it isn't already, and commit.

**Done when:** CLAUDE.md shows the new scope and the change is committed.

### 1. Scaffold the web monorepo

**Read:** plan 2.1, 2.6, 7.1, 7.2; ADR template.

**Build:**
- npm workspaces and Turborepo; strict TypeScript; ESLint with an import-boundary rule; Prettier; Vitest; Playwright.
- `apps/web`: Next.js with the App Router as a static export (`output: 'export'`), with the child area at `/` and the parent dashboard at `/parent` (ADR 0007, ADR 0042), each rendering a placeholder page. No route segments with runtime IDs, no middleware and no `next/image` optimization.
- Tailwind CSS v4 installed, with source scanning configured to include `packages/ui-kit` and `packages/games` (ADR 0043).
- Empty packages with a short README each: `contracts`, `ui-kit`, `i18n`, `game-sdk`, `learning-core`, `mock-api`. Empty `tools/game-sandbox`.
- A CI workflow running lint, typecheck, unit tests and one Playwright smoke test per app.
- Fill in the Commands section of CLAUDE.md.

**Done when:** `npm install`, `npm run dev`, `npm run build` (a static export), `npm run lint`, `npm run typecheck` and `npm test` all work; both areas open in the browser; the import-boundary rule fails on a deliberately bad import (show it, then remove it).

### 2. Internationalization

**Read:** plan 7.1, 7.2.

**Build:**
- `packages/i18n`: ICU MessageFormat, an English catalog, fallback chains and `Intl` formatting helpers for numbers, dates, plurals and units, served to the apps through next-intl (ADR 0042).
- Two pseudo-locales: long strings, and right-to-left.
- `dir` set from the locale at the app root.
- Lint rules that fail on:
  - string literals in JSX;
  - physical CSS properties in plain CSS (`margin-left`, `padding-right` and similar);
  - physical Tailwind direction classes (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`);
  - Tailwind arbitrary values for colours, spacing, radii, shadows and font sizes (ADR 0043).

**Done when:** both areas switch between English and the two pseudo-locales at runtime; the RTL pseudo-locale mirrors the layout; every lint rule catches a deliberate violation.

### 3. Design tokens and UI kit

**Read:** `docs/design-system/README.md`, `docs/design-system/tokens.json`, and every `docs/design-system/components/*/README.md` and `preview.html`; plan 1 ("What children never see"), 6.6, 8.1, 8.6, 8.7.

**Build:**
- Generate, with a script, the CSS custom properties and the Tailwind theme in `packages/ui-kit` from `docs/design-system/tokens.json`, with all three themes (Light, Dark, High contrast) switched by a `data-theme` attribute and no `dark:` variants. Tailwind's default colours, spacing, radii, shadows and font sizes are removed, and utilities carry the token names (ADR 0043). Copy no value by hand.
- Self-host the three font families (Baloo 2, Andika, Readex Pro) with `next/font` and local font files. The apps must never request fonts from Google at runtime.
- The six components specified in the design system, as React components built with Tailwind that match their preview and README: Button, AnswerTile, ActivityCard, Feedback, ProgressTrail and SkillStatus. `components/bundle.css` is a visual reference only; do not copy its class names.
- These additional components, built with Tailwind on design-system values only and following its README: AvatarPicker, ParentalGate (PIN or arithmetic by age, plan 8.1), Dialog and SettingsPanel (sound, music, voice, motion, text size, high contrast, dyslexia-friendly font).
- Experience-band settings for ages 3–5 and 6–8, as the design-system README describes.
- A preview page per component in each band, theme and pseudo-locale.

**Done when:** a test proves the generated CSS variables and Tailwind theme match `tokens.json` exactly; automated accessibility checks pass on every preview in all three themes; Playwright visual tests cover English and the RTL pseudo-locale; reduced motion turns off non-essential animation.

### 4. Contracts

**Read:** plan 3, 4.4, 5.1, 5.2, 6.2, 6.4.

**Build:** Zod schemas, with exported types, for: family, child profile and settings, learning goals, skills and prerequisites, activities, game manifest, the eight item types and their responses, learning events, session, skill state and status, recommendations with reason codes, and entitlements.

**Done when:** each schema has tests for valid examples and for rejection with clear errors; IDs are UUIDv7 strings and timestamps are ISO strings in UTC.

### 5. Mock API and fixtures

**Read:** plan 2.2, 3.4, 5.4, 8.1, 9.

**Build:**
- `packages/mock-api`: MSW handlers for the endpoints the apps need (session start, event batch ingest, child snapshot, catalog, recommendations, family settings). Every request and response is validated against `packages/contracts`.
- MSW runs in the browser: its worker starts before the app renders, served from the static export's `public/` folder, in every build until a backend exists (ADR 0011). Next.js serves no data itself (ADR 0042).
- Fixtures, all in one JSON file in `packages/mock-api` and validated against `packages/contracts` on load (ADR 0001): one family with a parent and two children (ages 6 and 8); a placeholder skill graph of about 25 maths skills for ages 6–8, marked in its file as a draft for learning-designer review; activities for the planned games.
- Simulated latency and failure modes (slow, offline, server error) the human can switch on in dev.
- Mock state persisted in the browser so a refresh keeps progress.

**Done when:** both apps can load fixture data through the handlers; event ingest is idempotent on the event ID; every failure mode can be triggered from a dev toggle.

### 6. Game SDK and session engine

**Read:** plan 4.2 (for the interface only), 6.1–6.4; `.claude/rules/games.md`.

**Build:**
- `packages/game-sdk`: the `GameManifest`, `GameModule`, `GameInstance` and `GameContext` contract from plan 6.2.
- A headless session engine that asks a policy for the next step, presents items, grades responses with item-type graders and emits learning events.
- A **placeholder policy** behind the real policy interface: fixed item order; on a wrong answer, retry, then hint, then show-me; at most three attempts. It returns reason codes. Step 13 replaces it with the real policy.
- A seeded RNG and an injected clock in `GameContext`.

**Done when:** a headless test runs a full session with a fake game module and asserts the exact event sequence; the same seed reproduces the same session.

### 7. Game shell, sandbox and conformance suite

**Read:** plan 6.1, 6.7, 6.8, 8.1, 8.6.

**Build:**
- The game shell in the child area of `apps/web`, as a client component that loads games with `next/dynamic` and `ssr: false` (ADR 0042): loading, pause menu, settings, progress strip, feedback and celebration overlays, hint button, exit behind the parental gate, error boundary, and pause on backgrounding.
- `tools/game-sandbox`: load any game with any item, band, locale, motion setting or theme, with hot reload.
- A conformance suite every game must pass: lifecycle events, pause and resume, no raw strings, keyboard reachability, automated accessibility checks, minimum viewport, bundle-size budget.
- A `create-game` command that scaffolds a game package with manifest, stubs, tests and sandbox stories.

**Done when:** a minimal demo game made with `create-game` runs in the sandbox and in the shell, and passes the conformance suite.

### 8. First game: Hop Line

**Read:** `docs/game-library.md` (Mathematics table, Hop Line example, game brief template); plan 6.5, 6.7.

**Do:**
- Write `packages/games/hop-line/BRIEF.md` from the template, for ages 6–8, addition within 20. **Stop and get the human's approval of the brief** before building.
- Build Hop Line with placeholder shapes: number-line placement items, a parametric item template seeded from difficulty features, a game-specific hint and a worked "show me".
- Practice and Challenge modes as in plan 4.2.
- The play route in the child area, with the activity in the query string (`/play?activity=<id>`, since the static export has no runtime route IDs): a client component that loads the activity from the catalog, its game from the registry with `next/dynamic` and `ssr: false`, and its items, plays it in the game shell from step 7c, and sends its session and events to the mock API (`POST /api/sessions`, then `POST /api/events`) until step 9's offline queue takes over.

**Done when:** it passes the conformance suite and every code-checkable item of the plan 6.7 definition of done; it is playable end to end in the shell against the mock API; the human has played it on a tablet.

### 9. Child app flows

**Read:** plan 1 (journeys), 4.3 (Today), 5.4, 8.1, 8.7.

**Build:**
- Child mode: profile picker by avatar, an optional picture PIN, and exit through the parental gate.
- The "Today" screen with three cards (review, new skill, free choice) from the mock recommendations.
- Activity library showing only what the child can play; no locked content or upgrade prompts.
- Session flow: warm-up, core block, always ending on a success.
- An offline event queue in IndexedDB with batched, idempotent sync and backoff; resume within 24 hours. It replaces the in-memory `apps/web/src/child/play/session-sync.ts` from step 8c.
- Daily time limit and break reminder from family settings.
- Installable PWA from the static export, with a Serwist service worker caching the app shell, game bundles and content (ADR 0042). MSW's service worker already serves the mock API (ADR 0011): combine the two, for example by importing MSW's script into the Serwist worker while the mock is on.

**Done when:** a Playwright test plays a full session with the network switched off midway and every event reaches the mock API after reconnecting, with no duplicates; a refresh mid-session resumes it.

### 10. Parent dashboard

**Read:** plan 1, 4.4, 5.2, 8.3, 8.4, 9.

**Build:**
- Mock sign-in at `/parent/login` (no real authentication) and family switcher.
- Child profiles: create and edit nickname, birth year and month, learning language and optional grade; nothing more (plan 8.3).
- Goals, subject balance, session length and daily limits.
- Progress by skill using the status names from plan 4.1, with "early signal" when evidence is thin.
- Recommendation and status explanations rendered from reason codes through localized templates, in growth language (plan 4.4).
- Session history using the definitions in plan 5.2.
- Placeholder plan and entitlement views driven by feature keys.

**Done when:** every number shown traces back to mock events or fixtures; no screen uses the words weak, failing or behind; accessibility checks pass.

### 11. Learning core: graders and evidence weights

**Read:** plan 5.2, 5.3, 6.4; `.claude/rules/learning-core.md`.

**Build:** pure graders for the four remaining item types (match-sort, sequence, build-spell, program; choice, audio-choice, numeric and placement exist since step 6) and the evidence-weighting rules, driven by config objects.

**Done when:** unit tests cover every rule; property tests prove repeats and later attempts never increase mastery evidence.

### 12. Learning core: learner model, mastery gate and simulator

**Read:** plan 4.1, 4.6.

**Build:** the Elo-style ability update with uncertainty, the mastery gate, the review ladder, and `tools/simulator` with synthetic learners and the release gates, run as `npm run sim` in CI.

**Done when:** `npm run sim` passes the learner-model gate in plan 4.6 (false mastery under 5%) and reports the three policy gates, and golden scenarios produce the exact expected decisions. The policy gates (success zone, scaffold loops, error streaks) measure step 13's policy and become required there (ADR 0031).

### 13. Learning core: in-session policy and planner

**Read:** plan 4.2, 4.3, 4.4.

**Build:**
- The real in-session policy, replacing the placeholder from step 6 behind the same interface.
- A learner model that follows a child who is learning (13b, ADR 0033).
- The planner that builds the Today screen. For now it runs inside the mock API handlers, so the same code can move to the server later.
- Reason codes flowing through to the parent dashboard explanations.

**Done when:** every simulator gate in plan 4.6 passes, the three policy gates included (ADR 0031), the success zone counted on the core block's targets (ADR 0033); Hop Line adapts as described in plan 4.2 when played by hand; Today changes sensibly after sessions.

### 14. Games two and three: Ten Frame Café and Tile Farm

**Read:** `docs/game-library.md`; plan 6.

**Do:** for each game, write the brief and **get approval**, then build it with placeholder shapes. Reuse shared item types so a skill can earn evidence from two different activities.

**Done when:** both pass the conformance suite and run in the Today flow; at least one skill is reachable through two different games.

### 15. Frontend hardening

**Read:** plan 6.7, 8.6, 12.2.

**Do:**
- A full accessibility pass with keyboard, switch access and a screen reader.
- Performance budgets enforced in CI (bundle sizes, load time on a throttled mid-range profile).
- A pass through the RTL pseudo-locale on every screen.
- A visual pass on whole screens, agreed with the human on 2026-10-22 and deferred to here. The components match the design system, but no screen layouts exist yet. Findings from that day:
  - The development Language menu and mock-API panel sit on top of the app's own buttons; gather them into one collapsed corner panel.
  - The profile picker still has step 1's placeholder disc next to the name, which the design system forbids ("Do not draw a mark"), and an empty gap above "Who's playing?".
  - Picker, Today, library and dashboard are columns of components. Propose layouts built from the Cover's composition, as screenshots for the human's approval before building them, and record them in an ADR.
  - Today and the library show one card while Hop Line is the only game; check them again after step 14.
- Flaky first loads in the Playwright suites, seen on 2026-10-22 and 2026-10-23 during step 13: a sandbox check, two UI preview checks and the web app's "leaving early" check each waited more than 5 seconds for their page's first element during a long run, then passed on a rerun. Find why the first load is slow (a cold development server, or Vite optimising dependencies mid-run) and fix that, rather than raising the timeouts.
- A short `docs/FRONTEND-STATUS.md` listing what is done, what is mocked, and what the backend must provide to replace the mocks.

**Done when:** all budgets and checks pass in CI, and the status document is reviewed by the human.

---

When step 15 is ticked, the frontend vertical slice is ready for a real backend. Steps 16 to 19 widen it on mock data (ADR 0039).

### 16. Accounts: sign-up, sign-in and onboarding

**Read:** plan 1 ("Core journeys"), 8.1, 8.3, 8.4; ADR 0007, 0018, 0025, 0039.

**Do:**
- Sign-up and sign-in in the parent area, with no passwords: an email magic link (the mock shows the link on screen instead of sending it), a passkey, and Google or Apple, all mocked.
- The plan's parent onboarding after sign-up: consent (the policy version, method and time), the first child (nickname, birth year and month, learning language, optional grade, nothing more), goals, and handing the device over in child mode to the new child.
- Signing out, and the existing mock accounts still signing in.
- The endpoints in `packages/contracts` and the mock API, each with a cross-tenant test.

**Done when:** in the browser, a new parent signs up, consents, adds a child, sets a goal and hands the device to that child, who appears in the profile picker; each sign-in method works; the accessibility checks pass.

### 17. Plans and payments, with a test checkout

**Read:** plan 9; ADR 0039.

**Do:**
- A plans page in the parent dashboard, from plans as data: entitlement keys and a price per market.
- A clearly marked test checkout step with no card fields, standing in for the provider's hosted checkout, then a receipt and the family's entitlements recomputed.
- Cancelling and downgrading, which lose nothing: learning history stays, and extra child profiles become read-only.
- Prices and upgrade prompts in the parent dashboard only.

**Done when:** in the browser, a free family upgrades and downgrades, every entitlement follows (premium activities, insight detail, more children), and child mode never shows a price or an upgrade prompt.

### 18. The landing site

**Read:** plan 2.6, 7, 8.3; `docs/design-system/`; ADR 0039.

**Do:** `apps/site`, a small static page with its own build: what Learnofun is, for parents, in the design system's look, through the i18n catalog, with no third-party scripts, linking to sign-up and sign-in in the web app.

**Done when:** it builds, passes lint, typecheck, the accessibility checks and both pseudo-locales, and its links reach the web app's sign-up and sign-in.

### 19. The launch games

**Read:** `docs/game-library.md`; plan 6, 10.1; ADR 0039.

**Do:** for each of the 8 launch games, in the order the human picks, write the brief and **get approval**, then build it as in step 14. Draft the skills a game needs that the skill graph lacks, for the learning designer. Split into one sub-step per game.

**Done when:** all 8 pass the conformance suite and run in the Today flow, and the English games give evidence for the literacy skills.