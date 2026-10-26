import type { PseudoLocale } from './locales';

const PLAIN = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ACCENTED = Array.from('åƀçðéƒĝĥîĵķļɱñöþǫŕšţûṽŵẋýžÅƁÇÐÉƑĜĤÎĴĶĻṀÑÖÞǪŔŠŢÛṼŴẊÝŽ');
const ACCENT_MAP = new Map(Array.from(PLAIN, (char, index) => [char, ACCENTED[index] ?? char]));

/** How much longer pseudo-localized text is than English, to expose layouts that cannot grow. */
const EXPANSION = 0.4;
const MIN_PADDING = 2;
const PADDING = '·';

/**
 * Turns already-formatted English into pseudo-localized text. The brackets show truncation; in
 * en-XA, any unaccented letter on screen is a hard-coded string.
 */
export function pseudoLocalize(text: string, locale: PseudoLocale): string {
  const body =
    locale === 'en-XA' ? Array.from(text, (char) => ACCENT_MAP.get(char) ?? char).join('') : text;
  const padding = PADDING.repeat(Math.max(MIN_PADDING, Math.ceil(text.length * EXPANSION)));
  return `[${body} ${padding}]`;
}
