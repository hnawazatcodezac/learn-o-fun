# 0017. Playtests on a tablet: the mock API answers from inside the page where service workers are unavailable

- Status: accepted
- Date: 2026-10-21
- Plan section: 6.7 (playtests), 10.1 (tablets); amends ADR 0011

## Context

FRONTEND-KICKOFF step 8 ends with a person playing Hop Line on a tablet. A tablet reaches the development server at the computer's network address, such as `http://192.168.1.20:5173`. ADR 0011 runs the mock API in MSW's service worker, and browsers allow service workers only in secure contexts: HTTPS, or `localhost`. Over plain HTTP at a network address, the app could not start its API.

The first choice was HTTPS with a self-signed certificate (`@vitejs/plugin-basic-ssl`). Testing showed it does not work: Chrome refuses to register a service worker when the certificate is not trusted, even after the warning is accepted ("An SSL certificate error occurred when fetching the script"). The plugin was removed.

## Options considered

1. **An in-page mock.** Serve over plain HTTP. Where there is no service worker, answer `/api` requests from inside the page with the same handlers and data.
2. **A trusted local certificate.** Install a local certificate authority (mkcert) on the computer and trust it on every tablet.
3. **Android USB forwarding.** Chrome forwards `localhost:5173` to a tablet on a cable; Android only.

## Decision

The team chose option 1.

- `startMockApi` uses the service worker wherever the browser has one, as ADR 0011 decided. Where `navigator.serviceWorker` does not exist, it replaces the page's `fetch` with one that answers `/api` requests from the mock handlers (`createInPageFetch`), sends everything else to the network, and fails like a real request in the offline mode.
- `npm run dev:lan` serves the app over plain HTTP on every network address of the computer, for tablets on the same network.
- No new dependency.

## Consequences

- Any tablet, iPad or Android, can open the app from the computer's Wi-Fi address with no setup.
- Over a network address, the browser's network panel shows no `/api` requests, and the PWA work in step 9 (which needs a service worker) can only be tried on `localhost` or HTTPS.
- A Playwright test runs the app with service workers removed, as on such a tablet, and checks that the mock API still answers and stores the session.
