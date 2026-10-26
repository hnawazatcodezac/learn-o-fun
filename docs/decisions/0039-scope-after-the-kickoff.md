# 0039. Scope after the kickoff: accounts, payments, the landing site and the launch games

- Status: accepted
- Date: 2026-10-23
- Plan section: 1 (core journeys), 2.6, 8.1, 8.4, 9, 10.1; FRONTEND-KICKOFF scope

## Context

On 2026-10-23 the human asked for more than the kickoff's fifteen steps: once they are done, sign-up, sign-in and payments pages on mock data (the backend comes later), a landing page, and every game in `docs/game-library.md`. The kickoff leaves real authentication, payments and `apps/site` out of scope, and the plan phases the 47 games: 3 in the slice, 8 more at launch, 23 to grow and 13 later. Only the first 11 serve the first release's subjects and ages (maths for 3–8, early English for 6–8); the rest serve subjects and ages the skill graph does not have yet. The human chose among these options.

## Options considered

1. **Games:** the 8 launch games first / all 47 in phase order, changing plan 10.1 / the 8 launch games plus briefs for the other 36.
2. **The landing page:** a separate site app, `frontend/apps/site` / a public route such as `/welcome` in `apps/web` / the landing page at `/`, moving the child area (changing ADR 0007).
3. **Sign-up and sign-in:** plan 8.1's methods, mocked / email and password, changing plan 8.1.
4. **Payments:** a plans page and a test checkout with no card fields / a card form inside the app.

## Decision

The first option each time.

- **Games:** the 8 launch games, each from a brief the human approves before its code: Number Garden, Shape Detective, Fact Rally and Market Stall for maths, and Blend Bridge, Word Builder Workshop, Story Explorer and Vocabulary Garden for early English. The other 36 wait for the plan's Grow and Later phases. Skills the games need that the draft skill graph lacks, such as maths for ages 3–5, are drafted as the games come, for the learning designer to review.
- **The landing site:** `frontend/apps/site`, the plan's `site` app: a small static page with its own build, the design system's tokens and the i18n catalog, right-to-left ready and accessible, with no third-party scripts, linking to sign-up and sign-in in the web app. The child area keeps `/` (ADR 0007).
- **Accounts:** no passwords (plan 8.1). Parents sign up and sign in with an email magic link, a passkey, or Google or Apple, all mocked: the mock shows the magic link on screen instead of sending an email, and the other buttons sign in a mock account. Sign-up follows the plan's parent onboarding: the account, consent (plan 8.4, with the policy version, method and time), the first child (nickname, birth year and month, learning language, optional grade), goals, and handing the device over in child mode. Children keep the profile picker and picture PINs; they never have credentials.
- **Payments:** a plans page in the parent dashboard from plans as data (plan 9), then a test checkout step, clearly marked, with no card fields, standing in for the provider's hosted checkout; a receipt; the family's entitlements recomputed; cancelling and downgrading, which lose nothing. Prices and upgrade prompts appear only in the parent dashboard, never in child mode.
- **Order:** after step 15, as kickoff steps 16 (accounts), 17 (plans and payments), 18 (the landing site) and 19 (the launch games, a sub-step per game).

## Consequences

- The kickoff's scope widens: `apps/site`, mock sign-in and a test checkout come in; real authentication, real payments, the API and the database stay out.
- Every new endpoint is a mock handler that follows `packages/contracts`, with a cross-tenant test (CLAUDE.md rule 4), so a backend can replace the mocks one by one.
- Because the app never collects card details, swapping the test checkout for Stripe's hosted checkout later needs no card-security work inside Learnofun.
- Revisit when the backend starts (the real sign-in providers and the billing provider), or if the human wants games beyond the first release before the slice's playtests.
