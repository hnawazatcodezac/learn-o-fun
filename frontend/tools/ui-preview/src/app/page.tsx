'use client';

import dynamic from 'next/dynamic';

/**
 * The preview runs in the browser only: it reads its component, band, theme and locale from the
 * address, so the static export's HTML holds the empty page until it starts (ADR 0042).
 */
const PreviewApp = dynamic(() => import('../PreviewApp').then((module) => module.PreviewApp), {
  ssr: false,
});

export default function Page() {
  return <PreviewApp />;
}
