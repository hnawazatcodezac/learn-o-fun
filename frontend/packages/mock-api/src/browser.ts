import { setupWorker } from 'msw/browser';
import { CONTROLS_KEY, readControls, STATE_KEY } from './controls';
import { seedData } from './data';
import { MockDatabase } from './database';
import { createHandlers } from './handlers';
import { createInPageFetch } from './in-page';
import { browserStorage } from './storage';

export interface StartMockApiOptions {
  /** Where the app serves MSW's worker script, such as `/mockServiceWorker.js`. */
  workerUrl: string;
  /** Hide MSW's log of each request. */
  quiet?: boolean;
}

/**
 * Starts the mock API in the browser with MSW's service worker (ADR 0011). Requests outside
 * `/api` pass through untouched. Resolves once the worker is ready, so start it before the app.
 *
 * Where the browser allows no service worker, as over plain HTTP on a network address, the mock
 * API answers from inside the page instead (ADR 0017).
 */
export async function startMockApi({ workerUrl, quiet = false }: StartMockApiOptions) {
  const db = new MockDatabase(seedData, browserStorage(STATE_KEY));
  const controlsStorage = browserStorage(CONTROLS_KEY);
  const handlers = createHandlers({ db, controls: () => readControls(controlsStorage) });
  // Service workers exist only in secure contexts: HTTPS, or localhost.
  if (typeof navigator.serviceWorker === 'undefined') {
    window.fetch = createInPageFetch(handlers, window.fetch.bind(window), window.location.href);
    if (!quiet) console.info('[mock-api] No service worker here: answering from inside the page.');
    return;
  }
  const worker = setupWorker(...handlers);
  await worker.start({ serviceWorker: { url: workerUrl }, onUnhandledFrame: 'bypass', quiet });
}
