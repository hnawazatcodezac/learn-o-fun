import '@learnofun/ui-kit/styles.css';
import { createBrowserI18n, I18nProvider, keepLocaleInUrl } from '@learnofun/ui-kit';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Preview } from './Preview';
import './preview.css';

const i18n = createBrowserI18n({ allowPseudo: true });

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element in index.html');

createRoot(container).render(
  <StrictMode>
    <I18nProvider i18n={i18n} onLocaleChange={keepLocaleInUrl}>
      <Preview />
    </I18nProvider>
  </StrictMode>,
);
