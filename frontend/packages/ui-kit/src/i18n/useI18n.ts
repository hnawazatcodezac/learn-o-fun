import {
  createFormatters,
  createTranslate,
  getDirection,
  pickLocale,
  type AppLocale,
} from '@learnofun/i18n';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Translations, the current locale and direction, and `Intl` formatters for that locale.
 * `translate` takes keys known only at run time, such as a game's, and stays the same function
 * across locale changes.
 */
export function useI18n() {
  const { t, i18n } = useTranslation();
  const locale = pickLocale(i18n.language, { allowPseudo: true });
  const format = useMemo(() => createFormatters({ locale }), [locale]);
  const translate = useMemo(() => createTranslate(i18n), [i18n]);

  return {
    t,
    translate,
    locale,
    dir: getDirection(locale),
    format,
    changeLocale: (next: AppLocale) => {
      void i18n.changeLanguage(next);
    },
  };
}
