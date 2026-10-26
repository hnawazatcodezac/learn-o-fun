'use client';

import type { ReactNode } from 'react';
import { ChildArea } from '../../child/ChildArea';

/** Everything under / is child-facing (ADR 0007). */
export default function ChildLayout({ children }: { children: ReactNode }) {
  return <ChildArea>{children}</ChildArea>;
}
