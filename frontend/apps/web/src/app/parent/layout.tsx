'use client';

import type { ReactNode } from 'react';
import { ParentArea } from '../../parent/ParentArea';

/** The parent dashboard: loaded only when /parent is opened, never by the child area (ADR 0007). */
export default function ParentAreaLayout({ children }: { children: ReactNode }) {
  return <ParentArea>{children}</ParentArea>;
}
