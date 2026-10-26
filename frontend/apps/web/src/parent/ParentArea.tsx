'use client';

import { AppearanceProvider } from '@learnofun/ui-kit';
import type { ReactNode } from 'react';
import { ParentSessionProvider } from './parent-session';
import './parent.css';

/**
 * The parent dashboard under /parent. It is for adults, so it has no experience band: the Family
 * world of the design system. Every page but the mock sign-in needs a signed-in parent (ADR 0025).
 */
export function ParentArea({ children }: { children: ReactNode }) {
  return (
    <AppearanceProvider>
      <ParentSessionProvider>{children}</ParentSessionProvider>
    </AppearanceProvider>
  );
}
