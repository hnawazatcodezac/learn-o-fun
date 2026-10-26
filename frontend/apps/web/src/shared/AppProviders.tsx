'use client';

import dynamic from 'next/dynamic';

/**
 * The app around every page: the mock API, the translations and the development tools. They run
 * in the browser only, so the static export's HTML holds the empty page until they are ready, as
 * a single-page app's did (ADR 0042).
 */
export const AppProviders = dynamic(
  () => import('./ClientApp').then((module) => module.ClientApp),
  { ssr: false },
);
