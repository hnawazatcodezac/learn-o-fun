import {
  createFormatters,
  createTranslate,
  finishMessage,
  getDirection,
  type AppLocale,
  type Translate,
} from '@learnofun/i18n';
import { useContext, useMemo } from 'react';
import { useTranslations } from 'use-intl';
import { I18nContext } from './I18nProvider';

/**
 * Translations, the current locale and direction, and `Intl` formatters for that locale, from
 * use-intl (ADR 0042). `translate` takes keys known only at run time, such as a game's, and stays
 * the same function across locale changes.
 */
export function useI18n() {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error('useI18n needs an I18nProvider around it');
  // use-intl's translator changes with the locale, so the component renders again.
  const translations = useTranslations();
  const locale = i18n.locale;

  const t = useMemo<Translate>(
    () => (key, values) => finishMessage(translations(key, values), locale),
    [translations, locale],
  );
  const translate = useMemo(() => createTranslate(i18n), [i18n]);
  const format = useMemo(() => createFormatters({ locale }), [locale]);

  return {
    t,
    translate,
    locale,
    dir: getDirection(locale),
    format,
    changeLocale: (next: AppLocale) => {
      i18n.changeLocale(next);
    },
  };
}
