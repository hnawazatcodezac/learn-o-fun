import { AppearanceProvider, appearanceFromSettings, type ExperienceBand } from '@learnofun/ui-kit';
import type { ReactNode } from 'react';
import { useChildSettings } from './child-mode';

/**
 * Presents one child screen in an experience band, with the child's theme, motion, text size and
 * font. Use one per page: it sets the attributes on `<html>` that the design tokens read.
 */
export function ChildScreen({ band, children }: { band: ExperienceBand; children: ReactNode }) {
  const { settings } = useChildSettings();
  return (
    <AppearanceProvider band={band} {...appearanceFromSettings(settings)}>
      {children}
    </AppearanceProvider>
  );
}
