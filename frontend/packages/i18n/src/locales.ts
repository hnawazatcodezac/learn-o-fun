/** Locales with real translations. English only until a second language is added. */
export const LOCALES = ['en'] as const;

/**
 * Pseudo-locales for proving layouts before real translations exist (plan 7.2). Both lengthen
 * text; en-XA also accents every letter, and en-XB reads right to left.
 */
export const PSEUDO_LOCALES = ['en-XA', 'en-XB'] as const;

export const DEFAULT_LOCALE = 'en';

export type Locale = (typeof LOCALES)[number];
export type PseudoLocale = (typeof PSEUDO_LOCALES)[number];
export type AppLocale = Locale | PseudoLocale;
export type Direction = 'ltr' | 'rtl';

const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ur']);

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function isPseudoLocale(value: string): value is PseudoLocale {
  return (PSEUDO_LOCALES as readonly string[]).includes(value);
}

export function getDirection(locale: string): Direction {
  if (locale === 'en-XB') return 'rtl';
  const language = locale.split('-')[0]?.toLowerCase() ?? '';
  return RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr';
}

/** The locale `Intl` formats with. Pseudo-locales format numbers and dates as English. */
export function formattingLocale(locale: string): string {
  return isPseudoLocale(locale) ? DEFAULT_LOCALE : locale;
}

/** Picks a supported locale, falling back to the default. Pseudo-locales only when allowed. */
export function pickLocale(
  requested: string | null | undefined,
  { allowPseudo }: { allowPseudo: boolean },
): AppLocale {
  if (requested == null) return DEFAULT_LOCALE;
  if (isLocale(requested)) return requested;
  if (allowPseudo && isPseudoLocale(requested)) return requested;
  return DEFAULT_LOCALE;
}
