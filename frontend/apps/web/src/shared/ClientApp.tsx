'use client';

import type { I18n } from '@learnofun/i18n';
import { createBrowserI18n, I18nProvider, keepLocaleInUrl } from '@learnofun/ui-kit';
import dynamic from 'next/dynamic';
import { useEffect, useState, type ReactNode } from 'react';

// Every build uses the mock API until a backend exists; NEXT_PUBLIC_API_MODE=live turns it off
// (ADR 0011).
const useMockApi = process.env.NEXT_PUBLIC_API_MODE !== 'live';

/**
 * Builds are an installable PWA (ADR 0024). With the mock API, MSW registers the app's service
 * worker, which serves both; the development server and the test build use MSW's own worker, with
 * no caching.
 */
const serviceWorkerUrl = __DEV_TOOLS__ ? '/mockServiceWorker.js' : '/sw.js';

/** The Language menu and the mock API panel, in builds with the development tools only. */
const DevTools = __DEV_TOOLS__
  ? dynamic(() => import('../dev/DevTools').then((module) => module.DevTools), { ssr: false })
  : () => null;

/**
 * Registers the service worker and waits until it controls the page. MSW reloads a page that its
 * worker is registered for but does not control, so it starts only once the worker does. A worker
 * that fails to install, or one that will not control this page (after a hard reload), is left
 * to MSW at once, as before.
 */
async function controlledBy(url: string): Promise<void> {
  const workers = navigator.serviceWorker;
  // Once a worker controls the page, MSW checks it for an update itself.
  if (workers.controller) return;
  const registration = await workers.register(url);
  const worker = registration.installing ?? registration.waiting;
  if (!worker) return;
  await new Promise<void>((resolve) => {
    workers.addEventListener(
      'controllerchange',
      () => {
        resolve();
      },
      { once: true },
    );
    worker.addEventListener('statechange', () => {
      if (worker.state === 'redundant') resolve();
    });
  });
}

/** Starts the mock API, or registers the service worker, once per page however often it renders. */
let started: Promise<void> | undefined;
function startServices(): Promise<void> {
  started ??= (async () => {
    if (useMockApi) {
      // The service worker installs, caching the app, while the mock API downloads rather than
      // after it, so the mock answers sooner on a first visit (ADR 0040).
      const worker =
        'serviceWorker' in navigator
          ? controlledBy(serviceWorkerUrl).catch(() => undefined)
          : undefined;
      const { startMockApi } = await import('@learnofun/mock-api/browser');
      await worker;
      await startMockApi({ workerUrl: serviceWorkerUrl, quiet: !__DEV_TOOLS__ });
    } else if (!__DEV_TOOLS__ && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register(serviceWorkerUrl).catch(() => undefined);
    }
  })();
  return started;
}

/**
 * The whole app, in the browser only (ADR 0042): nothing shows until the mock API answers and the
 * translations are ready. Loaded by `AppProviders` with `ssr: false`, so none of it is compiled for
 * the server, where MSW's browser module does not exist.
 */
export function ClientApp({ children }: { children: ReactNode }) {
  const [i18n, setI18n] = useState<I18n>();

  useEffect(() => {
    let mounted = true;
    void startServices().then(() => {
      if (mounted) setI18n((ready) => ready ?? createBrowserI18n({ allowPseudo: __DEV_TOOLS__ }));
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!i18n) return null;
  return (
    <I18nProvider i18n={i18n} onLocaleChange={__DEV_TOOLS__ ? keepLocaleInUrl : undefined}>
      {children}
      <DevTools mockApi={useMockApi} />
    </I18nProvider>
  );
}
