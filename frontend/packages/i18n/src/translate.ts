import type { I18n } from './create-i18n';

/** Translates a message key that is known only at run time, such as one of a game's own keys. */
export type TranslateKey = (
  key: string,
  values?: Readonly<Record<string, string | number>>,
) => string;

/**
 * Wraps `i18n.t` for keys that are plain strings rather than catalog-typed literals: games name
 * their keys in their manifest (plan 6.2), so the type checker cannot know them.
 */
export function createTranslate(i18n: I18n): TranslateKey {
  return i18n.t.bind(i18n) as unknown as TranslateKey;
}
