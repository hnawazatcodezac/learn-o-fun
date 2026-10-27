import type { I18n, MessageKey } from './create-i18n';

/** Translates a message key that is known only at run time, such as one of a game's own keys. */
export type TranslateKey = (
  key: string,
  values?: Readonly<Record<string, string | number>>,
) => string;

/**
 * `i18n.t` for keys that are plain strings rather than the catalog's typed keys: games name their
 * keys in their manifest (plan 6.2), so the type checker cannot know them. It follows the current
 * locale.
 */
export function createTranslate(i18n: I18n): TranslateKey {
  return (key, values) => i18n.t(key as MessageKey, values);
}
