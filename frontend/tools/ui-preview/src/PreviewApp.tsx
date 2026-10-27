import { createBrowserI18n, I18nProvider, keepLocaleInUrl } from '@learnofun/ui-kit';
import { Preview } from './Preview';

const i18n = createBrowserI18n({ allowPseudo: true });

/** The preview with its translations, pseudo-locales included, and the locale kept in the address. */
export function PreviewApp() {
  return (
    <I18nProvider i18n={i18n} onLocaleChange={keepLocaleInUrl}>
      <Preview />
    </I18nProvider>
  );
}
