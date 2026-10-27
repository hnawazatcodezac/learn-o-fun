'use client';

import dynamic from 'next/dynamic';

/**
 * The sandbox runs in the browser only: it reads its setup and locale from the address, and the
 * games run in the browser (ADR 0042), so the static export's HTML holds the empty page until it
 * starts.
 */
const SandboxApp = dynamic(() => import('../SandboxApp').then((module) => module.SandboxApp), {
  ssr: false,
});

export default function Page() {
  return <SandboxApp />;
}
