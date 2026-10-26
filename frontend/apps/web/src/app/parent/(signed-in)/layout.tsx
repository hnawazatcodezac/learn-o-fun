'use client';

import type { ReactNode } from 'react';
import { ParentLayout } from '../../../parent/ParentLayout';

/** Every page that needs a signed-in parent: signed out, it goes to the sign-in (ADR 0025). */
export default function SignedInLayout({ children }: { children: ReactNode }) {
  return <ParentLayout>{children}</ParentLayout>;
}
