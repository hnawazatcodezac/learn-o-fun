import { LOCALES, PSEUDO_LOCALES, pickLocale } from '@learnofun/i18n';
import { useId } from 'react';
import { useI18n } from './useI18n';

const DEV_LOCALES = [...LOCALES, ...PSEUDO_LOCALES];

/**
 * Language menu for checking the pseudo-locales during development. Render it only in
 * development builds: the child app shows no settings outside the parental gate (CLAUDE.md rule 6).
 */
export function DevLocaleSwitcher() {
  const { t, locale, changeLocale } = useI18n();
  const id = useId();

  return (
    <div className="lf-dev-locale">
      <label htmlFor={id}>{t('dev.localeSwitcher.label')}</label>
      <select
        id={id}
        value={locale}
        onChange={(event) => {
          changeLocale(pickLocale(event.target.value, { allowPseudo: true }));
        }}
      >
        {DEV_LOCALES.map((code) => (
          <option key={code} value={code}>
            {t(`dev.localeSwitcher.locales.${code}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
