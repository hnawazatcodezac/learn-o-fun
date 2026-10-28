# 0046. Accounts, consent and child mode in the mock API

- Status: accepted
- Date: 2026-10-28
- Plan section: 1 (parent onboarding), 8.1, 8.3, 8.4; FRONTEND-KICKOFF step 16; builds on ADR 0018, 0025, 0039

## Context

FRONTEND-KICKOFF step 16 adds sign-up, sign-in with no passwords and the plan's parent onboarding, all mocked (ADR 0039). Three things were open: how the mock records a parent's consent (plan 8.4 leaves the verifiable method to each market), whether the sign-in keeps the one-tap demo accounts, and which checks to run at the end.

While the step was being built, on 2026-10-28, the human asked for no page to be created or changed until they say so, because the screen designs will be updated first.

## Options considered

1. **Consent:** email confirmation, with the magic link as the email check / a tick box only, recorded as a declaration.
2. **Demo accounts:** keep Sam and Alex as one-tap demo accounts while the mock runs / remove them.
3. **The final check:** only what the step touches (lint, typecheck, unit tests and the web suite) / every suite.

## Decision

The human chose a tick box for consent, kept the demo accounts, and the narrower final check.

**What the mock API does now** (contracts in `packages/contracts`, handlers in `packages/mock-api`, each with unit tests and cross-tenant tests):

- **Sign-in links.**
  - `POST /api/parent/magic-links` sends a link to an email. The answer is the same whether or not an account has that email, and the mock includes the link in place of an email.
  - A link works once, for 15 minutes.
  - With sign-up details (name, country and dashboard language), redeeming it creates the account.
- **Sign-in.** `POST /api/parent/session` takes:
  - a link's token;
  - a passkey's credential ID (passkeys are added with `POST /api/parent/passkeys`);
  - Google's or Apple's account email, mocked;
  - or, in the mock only, a demo account's ID.

  An email with no account signs nobody in, unless sign-up details come with it. An email already in use simply signs in.
- **Sign-up.** It creates the account and a family with the new parent as owner, in the market's region and time zone. The family starts on the free plan's features (`freePlanFeatures` in the data file) until plans arrive as data in step 17.
- **Consent.**
  - `POST /api/families/:familyId/consent` lets an owner or guardian consent to the market's current privacy policy (`privacyPolicyVersion` in the market's configuration).
  - It is recorded as a declaration, with its policy version, evidence and time.
  - Records are never changed: a new version gets a new record, and `GET /api/families/:familyId` shows the latest.
  - No child can be added until a family has consented. The data file's two families have consented.
- **Child mode.** `POST /api/families/:familyId/child-mode` lets any member, a caregiver too, hand this device to the family's children. From then on, `GET /api/device/profiles` shows that family; until then, the first family, as before.
- **Demo accounts.** `GET /api/parent/accounts` offers only the data file's accounts, never someone who signed up.
- **Markets.** `GET /api/markets` lists the markets a family can sign up in.

**What waits:** the pages: sign-up, the sign-in with each method, onboarding (consent, first child, goal, hand-over) and adding a passkey. They are built once the human has updated the designs and asks for them (FRONTEND-KICKOFF 16b). The sign-in page keeps its demo accounts until then.

## Consequences

- When the pages are built, everything they need is already in the contracts and the mock, with tests.
- A backend replaces the same endpoints. A real verifiable consent method per market must be chosen before launch; the tick box is the mock's.
- The device stays paired with the first family until a parent hands it over, so existing child-mode behaviour is unchanged.
