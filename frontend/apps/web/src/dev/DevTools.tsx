'use client';

import { DevLocaleSwitcher } from '@learnofun/ui-kit';
import { MockControlsPanel } from './MockControlsPanel';

/**
 * The development tools in the corner: the Language menu, and the mock API panel while the mock
 * is on. Loaded only in builds with the development tools (ADR 0041).
 */
export function DevTools({ mockApi }: { mockApi: boolean }) {
  return (
    <>
      <DevLocaleSwitcher />
      {mockApi && <MockControlsPanel />}
    </>
  );
}
