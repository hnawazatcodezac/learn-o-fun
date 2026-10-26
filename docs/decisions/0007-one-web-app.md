# 0007. One web app for the child area and the parent dashboard

- Status: accepted
- Date: 2026-10-20
- Plan section: 2.1 (components), 8.1 (accounts and access), 10.1 (first public release)

## Context

Plan section 2.1 describes the Play app and the Family dashboard as two separate React apps. The team wants one app and one address: the child area at `/` and the parent dashboard under `/parent` (for example `/parent/login`).

## Options considered

1. Two apps, as in the plan. Strong separation by construction, but two dev servers, two deployments and two addresses.
2. One app with two route areas. One address and one deployment; separation has to be enforced deliberately.

## Decision

Option 2. `apps/web` replaces `apps/play` and `apps/family`.

- `/` is the child area (`src/child`), presented in the child's experience band. `/parent/*` is the parent area (`src/parent`), with no band. Routing uses `react-router`.
- The parent area is loaded only when `/parent` is opened, so the child area never downloads parent-dashboard code. A Playwright test checks this.
- A lint rule stops `src/child` and `src/parent` importing each other. Shared code goes in a package or `src/shared`.
- `npm run dev` starts only this app, at one address. The UI kit preview runs separately with `npm run dev:ui`.

## Consequences

- The way from the child area into `/parent` must go through the parental gate (CLAUDE.md rule 6). Nothing links there yet; the gate is built in FRONTEND-KICKOFF step 3c and wired to child mode in step 9. Once real sign-in exists, a parent's session must not be usable from child mode without that check.
- No third-party script may load in the child area. Anything the parent area needs, such as a payment provider's script, loads only on the parent page that uses it, never at app start.
- The store apps (Phase 3) will contain the parent area too, so the kids-category rules on purchases and external links (plan 8.8 and 9) apply to it.
- One deployment instead of two.
- Bundle: adding `react-router` grew the app's JavaScript from about 99 KB to 131 KB gzipped. The parent area's own code is a separate file.
- Revisit if the child area needs a stricter isolation than route-level splitting gives, for example a separate origin for storage.
