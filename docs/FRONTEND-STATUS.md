# Frontend status

Where the Learnofun web frontend stands on 2026-10-27, for the human's review (FRONTEND-KICKOFF 15h). It lists what is done, what is mocked, and what a backend must provide to replace the mocks.

## What is done

### The child area (`/`)
- **Who's playing?** A profile picker by picture, with an optional picture PIN that the API checks, so a device never learns a sibling's PIN (ADR 0018).
- **Today:** up to three cards (a review, a new skill and "Your choice"), planned from the child's own events by the planner in `learning-core` (ADR 0035).
- **All games:** only what the child can play, so no locked content and no upgrade prompts.
- **Play:** three games, Hop Line, Ten Frame Café and Tile Farm.
  - Each session has a warm-up and a core block, and always ends on a success.
  - The adaptive policy picks every item for the child's level (ADR 0032, ADR 0036).
  - Hints, a worked "show me" and the misconception checks are built in.
  - Practice and Challenge modes.
- **Healthy use:** the parent's session length and daily limit. The stretch reminder, "That's all for today", and one more session through the parental gate (ADR 0022).
- **Works offline:** an installable PWA that caches the whole app. Learning events queue in IndexedDB and are sent in order, in batches, with backoff. A session carries on after a refresh, for up to 24 hours (ADR 0023, ADR 0024).
- **The parental gate:** a times-table question before the grown-ups' settings and the way to the dashboard (ADR 0008).

### The parent dashboard (`/parent`)
- **Mock sign-in and the family switcher.** Owners, guardians and caregivers each see only what their role allows (ADR 0025).
- **Child profiles:** nickname, birth month and year, learning language and an optional school year, nothing more (ADR 0026).
- **Goals and time:** a subject focus (premium adds a skill and an end date), the subject balance, session length, daily limit and break reminder (ADR 0027).
- **Progress by skill,** with "early signal" when the evidence is thin, and the reasons for Today's activities, all in growth language (ADR 0028).
- **Session history** by plan 5.2's definitions, as counts and never a score (ADR 0029).
- **The plan page,** driven by feature keys.

### Learning core (`packages/learning-core`)
Pure and deterministic: no I/O, an injected clock and a seeded random source. It contains:
- the graders for every item type, and the evidence weights (ADR 0030);
- the learner model, the mastery gate and the review ladder (ADR 0031, ADR 0034);
- the in-session policy (ADR 0032) and the planner for Today (ADR 0035);
- `npm run sim`, which runs 2,000 synthetic learners each learning fast, slowly or not at all. Every required gate passes. The success-zone gate is reported, not required: its 70% target went to a learning designer (ADR 0034).

### Platform
- **Web stack:** Next.js static exports and Tailwind CSS on the design system's tokens. The colours, type, spacing and icons are the screen designs' own (ADR 0042–0045).
- **Translations:** every string is an ICU message key. Two pseudo-locales, long text (en-XA) and right to left (en-XB), are checked on every screen.
- **Tools:**
  - the UI kit preview;
  - the game sandbox;
  - `create-game`, which scaffolds a new game;
  - the game conformance suite;
  - the development panel, with the Language menu and the mock API controls.

### Checks, run in CI
- lint, with boundary, purity, UI-text, logical-direction and Tailwind rules;
- typecheck;
- unit and property tests;
- the simulator gates;
- Playwright: the web app, the PWA on a production build, the conformance suite, the UI preview, the sandbox and each game;
- WCAG 2.2 AA on every screen, in all three locales and in the light, dark and high-contrast themes;
- keyboard and switch walkthroughs, the right-to-left pass and the performance budgets (FRONTEND-KICKOFF 15e–15g). The load-time budget fails for now (see below).

## What is mocked

- **The whole API.** MSW answers inside the page, from `packages/mock-api`, with every request and response checked against `packages/contracts`. It runs in every build until a backend exists. A build with `NEXT_PUBLIC_API_MODE=live` leaves it out (ADR 0011).
- **The data:** one file, `frontend/packages/mock-api/src/data/mock-data.json`. It holds two families, three children, the catalog, the skill graph and the session scripts that are played into events when the mock starts (ADR 0028). The mock's state is kept in the browser's localStorage, and the development panel resets it.
- **Sign-in:** pick a demo account. The mock API also has sign-up, sign-in links, passkeys, Google and Apple, consent and handing a device over (ADR 0046), whose pages wait for the updated designs (step 16b). There are no passwords and no real authentication yet.
- **Content and art:**
  - placeholder shapes and a placeholder frog;
  - draft skills and difficulties, for a learning designer;
  - draft early-English skills, with no games yet;
  - no audio, so no speaker buttons yet.
- **Not built:** payments and plans (step 17), email, and the public website (step 18).

## What the backend must provide

The same API as `packages/contracts` describes (OpenAPI and typed clients are generated from it):

| Area | Endpoints |
| --- | --- |
| Device | `GET /device/profiles`, `POST /device/profiles/:childId/unlock` (checks a picture PIN without revealing it) |
| Parent session | `GET /parent/accounts` (mock only), `GET`, `POST`, `DELETE /parent/session` (sign-in with a link, a passkey, Google or Apple, and sign-up), `POST /parent/magic-links`, `POST /parent/passkeys` (ADR 0046) |
| Families | `GET /families/:familyId`, `POST /families/:familyId/consent`, `POST /families/:familyId/children` (only after consent), `PUT /families/:familyId/children/:childId`, `POST /families/:familyId/child-mode` |
| A child, for parents | `GET …/progress`, `GET …/sessions`, `GET …/learning`, `PUT …/time-limits`, `PUT …/subject-balance`, `PUT` and `DELETE …/goal` |
| A child, in child mode | `GET /children/:childId/snapshot`, `GET /children/:childId/today`, `PUT /children/:childId/settings`, `POST /children/:childId/extra-time` |
| Play | `POST /sessions`, `POST /events` (batches, idempotent by event ID) |
| Reference | `GET /catalog`, `GET /markets`, `GET /markets/:market` |

What the backend has to guarantee:
- **Tenancy:** every family endpoint answers 401 when signed out and 404 for another family's data. Every tenant table has a `family_id` and row-level security, and every endpoint gets a cross-tenant test (CLAUDE.md rule 4).
- **Events:** learning events are append-only. Sessions and events arrive with IDs (UUIDv7) made on the device, in UTC, in order and possibly more than once, so receiving is idempotent. Progress, history and Today are projections rebuilt from the events (CLAUDE.md rules 3 and 8).
- **Learning:** the server runs the same `learning-core` (learner model, mastery gate, planner) on the events, so Today and the dashboard agree with what the device played. Game scores never feed mastery (CLAUDE.md rule 9).
- **Roles:** an owner, guardian or caregiver can do only what their role allows, checked on the server (plan 8.4).
- **Picture PINs:** checked on the server. A device never receives another child's PIN.
- **Data collected:** only the nickname, birth year and month, and learning language (CLAUDE.md rule 7).

## Waiting on the human

- **The load-time budget fails** (ADR 0040, FRONTEND-KICKOFF 15g). The bundle caps and the no-development-code check pass. On slow 4G with the CPU 4× slower:
  - first visits take 6.7–9.3 seconds after the speed-ups of 2026-10-27, against 3;
  - signed-in dashboard pages take about 3–4.6 seconds.

  Nothing paints until the mock API has replayed its scripted sessions in the page, and on slow 4G the scripts alone take more than 3 seconds to arrive. The budget is unchanged until you decide how to meet it.
- **Tablet play-throughs** of Hop Line (8c) and of the adaptive play route (13d).
- **The screenshot tests** need Docker Desktop running, then `npm run visual -- --update-snapshots` and a look at the images. The icons changed on 2026-10-27, so the stored screenshots are out of date (1g, 15d).
- **The screen designs:** you asked for their screens to wait. Your four answers for then are in ADR 0044:
  - a 4-digit PIN;
  - one child at a time on the overview;
  - the goals page in the designs' look, keeping everything we have;
  - the grown-ups' settings only in the dashboard.
- **The screen-reader checklist,** `docs/screen-reader-checklist.md`, for NVDA or VoiceOver.
- **A learning designer** to look at the success-zone target (ADR 0034) and the draft skills and difficulties.
- **Prices and plan limits,** shown as placeholders such as `[YEARLY PRICE]`.
- **Commits:** nothing has been committed since the first commit. A `.gitattributes` with LF line endings is suggested, since some tools on Windows write CRLF.

## How to run it

From `frontend/`: `npm install`, then `npm run dev` and open http://localhost:5173 (the child area) or http://localhost:5173/parent (the dashboard; sign in as Sam or Alex). See CLAUDE.md's Commands for every suite.
