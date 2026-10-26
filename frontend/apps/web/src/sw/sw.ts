/// <reference lib="webworker" />
import { Serwist, type PrecacheEntry } from 'serwist';

/*
 * The app's service worker (ADR 0024), built after `next build` by scripts/build-sw.mjs with
 * Serwist (ADR 0042). Every file of the static export is cached, so the app opens with no network:
 * each page, each game's bundle, the styles and the fonts. A new version installs in the
 * background and takes over once every tab of the app has closed.
 */
declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | PrecacheEntry)[];
};

/** Whether this build uses the mock API (ADR 0011), set when the worker is built. */
declare const __MOCK_API__: boolean;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    // Any page opens from the cache, whatever its query string: /play?activity=… is play.html.
    cleanURLs: true,
    ignoreURLParametersMatching: [/.*/],
  },
});
serwist.addEventListeners();

// The API's data is kept by the child area itself, for when it is offline (ADR 0024).
if (__MOCK_API__) {
  // The mock API (ADR 0011), after Serwist's routes: cached files come from the cache, and /api
  // from the mock. MSW's script would take over at once on an update; it waits instead.
  self.skipWaiting = () => Promise.resolve();
  importScripts('/mockServiceWorker.js');
}
