import { formattingLocale, isPseudoLocale } from './locales';
import { pseudoLocalize } from './pseudo';

/** Digits to format with. A market setting: some Gulf schools teach Arabic-Indic digits (plan 7.5). */
export type NumberingSystem = 'latn' | 'arab';

export interface FormatterOptions {
  locale: string;
  numberingSystem?: NumberingSystem;
}

/** Number, date, list, relative-time, unit and plural helpers, all through `Intl`. */
export function createFormatters({ locale, numberingSystem }: FormatterOptions) {
  const base = formattingLocale(locale);
  const intlLocale = numberingSystem ? `${base}-u-nu-${numberingSystem}` : base;
  /** Names and dates are text, so the pseudo-locales lengthen and mirror them, as content. */
  const name = (value: string) => (isPseudoLocale(locale) ? pseudoLocalize(value, locale) : value);

  return {
    number: (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(intlLocale, options).format(value),
    unit: (value: number, unit: string, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(intlLocale, { ...options, style: 'unit', unit }).format(value),
    date: (value: Date, options?: Intl.DateTimeFormatOptions) =>
      name(new Intl.DateTimeFormat(intlLocale, options).format(value)),
    relativeTime: (
      value: number,
      unit: Intl.RelativeTimeFormatUnit,
      options?: Intl.RelativeTimeFormatOptions,
    ) => name(new Intl.RelativeTimeFormat(intlLocale, options).format(value, unit)),
    list: (items: readonly string[], options?: Intl.ListFormatOptions) =>
      new Intl.ListFormat(intlLocale, options).format(items),
    pluralCategory: (value: number, options?: Intl.PluralRulesOptions) =>
      new Intl.PluralRules(intlLocale, options).select(value),
    /** A month's name, such as "October", for month 1 to 12. */
    monthName: (month: number, width: 'long' | 'short' = 'long') =>
      name(
        new Intl.DateTimeFormat(intlLocale, { month: width, timeZone: 'UTC' }).format(
          Date.UTC(2000, month - 1, 1),
        ),
      ),
    /** A language's name in the reader's language, such as "English" for `en`. */
    languageName: (code: string) =>
      name(new Intl.DisplayNames(intlLocale, { type: 'language' }).of(code) ?? code),
  };
}

export type Formatters = ReturnType<typeof createFormatters>;
