'use client';

import { DevLocaleSwitcher, useI18n } from '@learnofun/ui-kit';
import { useState } from 'react';
import { MockControlsPanel } from './MockControlsPanel';

/** Whether the panel was open, so it stays open when a mock setting reloads the page. */
const OPEN_KEY = 'learnofun.devTools.open';

function wasOpen(): boolean {
  try {
    return sessionStorage.getItem(OPEN_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * The development tools, in one panel in the corner that stays closed until it is wanted: the
 * Language menu, and the mock API controls while the mock is on (FRONTEND-KICKOFF 15b). Loaded
 * only in builds with the development tools (ADR 0041). Developer tools are not for children, so
 * they keep the Family small style in both worlds.
 */
export function DevTools({ mockApi }: { mockApi: boolean }) {
  const { t } = useI18n();
  const [open] = useState(wasOpen);

  return (
    <details
      className="fixed inset-s-2 inset-be-2 z-30 rounded-ui border border-line-strong bg-surface-raised font-sans text-family-small text-ink"
      data-testid="dev-tools"
      open={open}
      onToggle={(event) => {
        try {
          sessionStorage.setItem(OPEN_KEY, String(event.currentTarget.open));
        } catch {
          // Without storage, the panel only forgets whether it was open.
        }
      }}
    >
      <summary
        className="min-block-target-family cursor-pointer px-3 py-2 font-label focus-visible:shadow-focus-ring focus-visible:outline-none"
        data-testid="dev-tools-toggle"
      >
        {t('dev.tools.title')}
      </summary>
      <div className="flex flex-wrap items-end gap-3 px-2 pbe-2">
        <DevLocaleSwitcher />
        {mockApi && <MockControlsPanel />}
      </div>
    </details>
  );
}
