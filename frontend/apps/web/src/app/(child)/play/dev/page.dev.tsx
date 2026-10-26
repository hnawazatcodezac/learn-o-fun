'use client';

import dynamic from 'next/dynamic';
import { PageLoading } from '../../../../shared/PageLoading';

/**
 * /play/dev?game=<id>: a game's stories in the game shell, with the development tools only. It runs only in the browser: games use the canvas, IndexedDB and audio (ADR 0042).
 */
const DevPlay = dynamic(
  () => import('../../../../child/play/DevPlay').then((module) => module.DevPlay),
  {
    ssr: false,
    loading: () => <PageLoading />,
  },
);

export default function Page() {
  return <DevPlay />;
}
