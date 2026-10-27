import { getDirection, type I18n } from '@learnofun/i18n';
import {
  createContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { IntlProvider } from 'use-intl';

/** The app's translations, for `useI18n` (ADR 0042). */
export const I18nContext = createContext<I18n | null>(null);

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

/**
 * Provides translations through use-intl's provider, which every app shares (ADR 0042), and keeps
 * `<html lang dir>` in step with the current locale.
 */
export function I18nProvider({ i18n, onLocaleChange, children }: I18nProviderProps) {
  // Each change of locale renders the provider again, with that locale's settings.
  const subscribe = useCallback((listener: () => void) => i18n.onLocaleChange(listener), [i18n]);
  const locale = useSyncExternalStore(
    subscribe,
    () => i18n.locale,
    () => i18n.locale,
  );

  useLayoutEffect(() => {
    applyToDocument(locale);
  }, [locale]);

  useEffect(
    () =>
      i18n.onLocaleChange((next) => {
        onLocaleChange?.(next);
      }),
    [i18n, onLocaleChange],
  );

  return (
    <IntlProvider {...i18n.settings}>
      <I18nContext value={i18n}>{children}</I18nContext>
    </IntlProvider>
  );
}
