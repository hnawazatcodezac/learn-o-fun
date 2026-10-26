import i18next, { type i18n, type PostProcessorModule } from 'i18next';
import ICU from 'i18next-icu';
import en from './catalogs/en.json';
import { DEFAULT_LOCALE, isPseudoLocale, type AppLocale } from './locales';
import { pseudoLocalize } from './pseudo';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
  }
}

export type I18n = i18n;

export interface CreateI18nOptions {
  /** Called when a key is missing from every locale in the fallback chain. */
  onMissingKey?: (key: string, locale: string) => void;
}

/**
 * Creates an i18next instance with ICU MessageFormat messages (plan 7.1). Lookups fall back
 * from a regional locale to its language and then to English, for example en-AE → en.
 */
export function createI18n(locale: AppLocale, { onMissingKey }: CreateI18nOptions = {}): I18n {
  const instance = i18next.createInstance();

  const pseudo: PostProcessorModule = {
    type: 'postProcessor',
    name: 'pseudo',
    process: (value) =>
      isPseudoLocale(instance.language) ? pseudoLocalize(value, instance.language) : value,
  };

  void instance
    .use(ICU)
    .use(pseudo)
    .init({
      resources: { [DEFAULT_LOCALE]: { translation: en } },
      lng: locale,
      fallbackLng: DEFAULT_LOCALE,
      initAsync: false,
      postProcess: ['pseudo'],
      returnEmptyString: false,
      saveMissing: onMissingKey !== undefined,
      missingKeyHandler: (_locales, _namespace, key) => {
        onMissingKey?.(key, instance.language);
      },
    });

  return instance;
}
