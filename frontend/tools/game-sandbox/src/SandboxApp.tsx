import { createBrowserI18n, I18nProvider, keepLocaleInUrl } from '@learnofun/ui-kit';
import { Sandbox } from './Sandbox';

const i18n = createBrowserI18n({ allowPseudo: true });

// A change to a game's code reloads the page on the development server (live-reload.ts).
if (process.env.NODE_ENV === 'development') void import('./live-reload');

/** The sandbox with its translations, pseudo-locales included, and the locale kept in the address. */
export function SandboxApp() {
  return (
    <I18nProvider i18n={i18n} onLocaleChange={keepLocaleInUrl}>
      <Sandbox />
    </I18nProvider>
  );
}
