import { createI18n, type AppLocale } from '@learnofun/i18n';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DevLocaleSwitcher } from './DevLocaleSwitcher';
import { I18nProvider } from './I18nProvider';
import { useI18n } from './useI18n';

function Probe() {
  const { t, dir, locale, format } = useI18n();
  return (
    <p data-dir={dir} data-locale={locale}>
      {t('parent.title')} {format.number(1234)}
    </p>
  );
}

function renderIn(locale: AppLocale, children: ReactNode) {
  return renderToString(<I18nProvider i18n={createI18n(locale)}>{children}</I18nProvider>);
}

describe('I18nProvider and useI18n', () => {
  it('render English text and formatting', () => {
    const html = renderIn('en', <Probe />);

    expect(html).toContain('Learnofun for families');
    expect(html).toContain('1,234');
    expect(html).toContain('data-dir="ltr"');
  });

  it('report the right-to-left direction for en-XB', () => {
    const html = renderIn('en-XB', <Probe />);

    expect(html).toContain('data-dir="rtl"');
    expect(html).toContain('data-locale="en-XB"');
  });

  it('render pseudo-localized text for en-XA', () => {
    expect(renderIn('en-XA', <Probe />)).toContain('[Ļéåŕñöƒûñ ƒöŕ ƒåɱîļîéš');
  });

  it('translate keys known only at run time, such as a game’s', () => {
    function GameText({ messageKey }: { messageKey: string }) {
      const { translate } = useI18n();
      return <p>{translate(messageKey)}</p>;
    }

    expect(renderIn('en', <GameText messageKey="games.demoChoice.answers" />)).toContain('Answers');
  });
});

describe('DevLocaleSwitcher', () => {
  it('offers English and both pseudo-locales, with the current one selected', () => {
    const html = renderIn('en-XB', <DevLocaleSwitcher />);

    expect(html).toContain('Language');
    expect(html).toMatch(/<option value="en">/);
    expect(html).toMatch(/<option value="en-XA">/);
    expect(html).toMatch(/<option value="en-XB" selected="">/);
  });
});
