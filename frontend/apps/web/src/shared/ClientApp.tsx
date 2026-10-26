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

/** Starts the mock API, or registers the service worker, once per page however often it renders. */
let started: Promise<void> | undefined;
function startServices(): Promise<void> {
  started ??= (async () => {
    if (useMockApi) {
      const { startMockApi } = await import('@learnofun/mock-api/browser');
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
