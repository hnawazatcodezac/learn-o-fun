import { DEFAULT_LOCALE, isPseudoLocale, type AppLocale } from './locales';
import { pseudoLocalize } from './pseudo';

/** Content text by locale, such as an item's prompt: `{ "en": "What is 2 + 3?" }`. */
export type LocalizedContent = Readonly<Record<string, string>>;

/**
 * Picks content text for a locale: the locale itself, then its language, then English, then
 * whatever there is. In a pseudo-locale, content is pseudo-localized too, so the long-text and
 * right-to-left checks cover game content as well as interface text.
 */
export function localizeContent(text: LocalizedContent, locale: AppLocale): string {
  const language = locale.split('-')[0] ?? DEFAULT_LOCALE;
  const chosen =
    text[locale] ?? text[language] ?? text[DEFAULT_LOCALE] ?? Object.values(text)[0] ?? '';
  return isPseudoLocale(locale) ? pseudoLocalize(chosen, locale) : chosen;
}
