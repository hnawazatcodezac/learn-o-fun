# 0024. The installable PWA, and its service worker with MSW's

- Status: accepted; superseded in part by 0042 (Serwist replaces vite-plugin-pwa)
- Date: 2026-10-22
- Plan section: 2 (architecture: one installable web app), 5.4 (offline), 8.7; FRONTEND-KICKOFF step 9d

## Context

Step 9d: an installable PWA with a service worker caching the app shell, game bundles and content. MSW's service worker already serves the mock API in the browser (ADR 0011), and a page has one service worker for its scope, so the two must be one. Installing needs a web app manifest with icons, but the design system says to draw no mark until a logo is designed. Updates must never interrupt a child's session.

## Options considered

1. **Icon:** plain brand shapes from the tokens / a solid colour / no icons until the logo.
2. **Offline data:** keep the child area's last good data on the device / cache the app only.
3. **Tooling:** `vite-plugin-pwa` (on Workbox) / a hand-written worker and build plugin.
4. **Updates:** take over on the next launch / a "new version" message for grown-ups.

## Decision

The first option each time, as the team chose.

- **`vite-plugin-pwa` 2.0, `injectManifest` mode**, with our own worker, `apps/web/src/sw/sw.ts`. Workbox precaches every file of the build: the app shell, each game's bundle, the fonts and the styles, so the app opens with no network. Navigations fall back to the cached `index.html`. New dependencies, all MIT: `vite-plugin-pwa`, with `workbox-build` and `workbox-window` for building, and `workbox-core`, `workbox-precaching` and `workbox-routing`, which the worker bundles.
- **One worker for both.** In builds with the mock API, the worker imports MSW's `mockServiceWorker.js` after Workbox's routes, so cached files come from the cache and `/api` from the mock. The app starts MSW with this worker's URL. Builds without the mock (`VITE_API_MODE=live`) register the worker directly. The development server keeps MSW's own worker, with no caching, so changes show at once.
- **The child area keeps its last data** (the team's choice): the last answer the API gave for the profiles, each child's snapshot, Today and the catalog is kept in IndexedDB, checked against its contract again when read, and used only when the API cannot be reached (plan 5.4: the device holds a learner snapshot). With the outbox (ADR 0023), the installed app opens and plays offline, in either kind of build. It is only data the device already had, and it goes when the site's data is cleared.
- **Updates on the next launch.** A new worker installs in the background and waits until every tab of the app has closed. MSW's script would skip that wait; the combined worker turns its `skipWaiting` into a no-op, so the rule holds in mock builds too.
- **The icon is plain brand shapes**: a `sun` disc on `navy`, in the tokens' colours, with no letters, made like the ActivityCard's placeholder art. It is the one exception to "draw no mark", until the logo replaces it. A script renders it to PNG at 192 and 512 pixels, and a maskable 512 with the shapes inside the safe zone. The manifest's colours come from the tokens.
- No install button in the child area: the browser's own install offer is the way, and the parent area can add one later.

## Consequences

- Once opened online, the app works offline: its files from the worker's cache, its data from the last good copy, and what is played waits in the outbox (ADR 0023). A device that has never been online, or a child never chosen on it, still needs the network once.
- A deploy reaches a device only after the app has been closed once; a fix that cannot wait needs another way.
- The worker is tested against a production build served by `vite preview`, so those browser tests build the app first.
- Replace the icon files when the logo exists; the manifest and the script stay.
