import { createI18n, pickLocale, type I18n } from '@learnofun/i18n';

/**
 * Creates the app's i18n instance. The `?locale=` URL parameter picks the locale; pseudo-locales
 * are honoured only when allowed, which apps limit to development builds.
 */
export function createBrowserI18n({ allowPseudo }: { allowPseudo: boolean }): I18n {
  const requested = new URLSearchParams(window.location.search).get('locale');
  return createI18n(pickLocale(requested, { allowPseudo }), {
    onMissingKey: (key, locale) => {
      console.warn(`Missing message "${key}" for locale ${locale}`);
    },
    onError: (error) => {
      console.error(error);
    },
  });
}

/** Keeps the current locale in the URL, so a refresh stays in it. */
export function keepLocaleInUrl(locale: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('locale', locale);
  window.history.replaceState(null, '', url);
}
