import { TEXT_SCALES, type ExperienceBand, type TextScale } from '@learnofun/contracts';
import { IconContext } from '@phosphor-icons/react/dist/lib/context';
import type { IconProps } from '@phosphor-icons/react/dist/lib/types';
import { useLayoutEffect, type ReactNode } from 'react';

/** Phosphor icons are Bold in the Play world and Regular in the Family world (ADR 0019). */
const PLAY_ICONS: IconProps = { color: 'currentColor', size: '1em', weight: 'bold' };
const FAMILY_ICONS: IconProps = { color: 'currentColor', size: '1em', weight: 'regular' };

export const THEMES = ['system', 'light', 'dark', 'contrast'] as const;
export type Theme = (typeof THEMES)[number];

// The text-size setting is part of the child's settings in packages/contracts.
export { TEXT_SCALES, type TextScale };

/** 'dyslexia' switches to Andika, a font for beginning readers (plan 8.6). */
export const FONTS = ['default', 'dyslexia'] as const;
export type Font = (typeof FONTS)[number];

export interface Appearance {
  /** Presentation tier for child-facing screens. Leave it out for the parent dashboard. */
  band?: ExperienceBand | undefined;
  /** 'system' follows the device's light, dark and contrast preferences. */
  theme?: Theme | undefined;
  /** The reduced-motion setting. The device's own preference applies either way. */
  reducedMotion?: boolean | undefined;
  textScale?: TextScale | undefined;
  font?: Font | undefined;
}

type AppearanceAttribute =
  'data-band' | 'data-theme' | 'data-motion' | 'data-text-scale' | 'data-font';

/** The `<html>` attributes the design tokens read. `undefined` means the attribute is removed. */
export function appearanceAttributes({
  band,
  theme = 'system',
  reducedMotion = false,
  textScale = 1,
  font = 'default',
}: Appearance): Record<AppearanceAttribute, string | undefined> {
  return {
    'data-band': band,
    'data-theme': theme === 'system' ? undefined : theme,
    'data-motion': reducedMotion ? 'reduced' : undefined,
    'data-text-scale': textScale === 1 ? undefined : String(textScale),
    'data-font': font === 'default' ? undefined : font,
  };
}

/**
 * Applies the band, theme and settings to `<html>`, where the design tokens read them, and gives
 * the icons inside it their world's weight.
 */
export function AppearanceProvider({
  children,
  ...appearance
}: Appearance & { children: ReactNode }) {
  const { band, theme, reducedMotion, textScale, font } = appearance;

  useLayoutEffect(() => {
    const root = document.documentElement;
    const attributes = appearanceAttributes({ band, theme, reducedMotion, textScale, font });
    for (const [name, value] of Object.entries(attributes)) {
      if (value === undefined) root.removeAttribute(name);
      else root.setAttribute(name, value);
    }
  }, [band, theme, reducedMotion, textScale, font]);

  return (
    <IconContext.Provider value={band === undefined ? FAMILY_ICONS : PLAY_ICONS}>
      {children}
    </IconContext.Provider>
  );
}
