import { getDirection, type I18n } from '@learnofun/i18n';
import { useLayoutEffect, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

interface I18nProviderProps {
  i18n: I18n;
  /** Called after the locale changes, for example to keep it in the URL during development. */
  onLocaleChange?: ((locale: string) => void) | undefined;
  children: ReactNode;
}

function applyToDocument(locale: string) {
  document.documentElement.lang = locale;
  document.documentElement.dir = getDirection(locale);
}

/** Provides translations and keeps `<html lang dir>` in step with the current locale. */
export function I18nProvider({ i18n, onLocaleChange, children }: I18nProviderProps) {
  useLayoutEffect(() => {
    applyToDocument(i18n.language);
    const handleChange = (locale: string) => {
      applyToDocument(locale);
      onLocaleChange?.(locale);
    };
    i18n.on('languageChanged', handleChange);
    return () => {
      i18n.off('languageChanged', handleChange);
    };
  }, [i18n, onLocaleChange]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
