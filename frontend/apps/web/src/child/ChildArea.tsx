'use client';

import type { ReactNode } from 'react';
import { ChildModeProvider } from './child-mode';

/**
 * Everything under / is child-facing. Each screen presents itself in the child's experience band
 * through `ChildScreen`.
 */
export function ChildArea({ children }: { children: ReactNode }) {
  return <ChildModeProvider>{children}</ChildModeProvider>;
}
