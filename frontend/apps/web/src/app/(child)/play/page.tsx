'use client';

import dynamic from 'next/dynamic';
import { PageLoading } from '../../../shared/PageLoading';

/**
 * /play?activity=<id>: one session of an activity from the catalog, with `?skill=` and `?mode=`. It runs only in the browser: games use the canvas, IndexedDB and audio (ADR 0042).
 */
const ActivityPlay = dynamic(
  () => import('../../../child/play/ActivityPlay').then((module) => module.ActivityPlay),
  {
    ssr: false,
    loading: () => <PageLoading />,
  },
);

export default function Page() {
  return <ActivityPlay />;
}
