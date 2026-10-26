import { createI18n } from '@learnofun/i18n';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { SettingsPanel } from './SettingsPanel';
import { DEFAULT_PLAY_SETTINGS } from '@learnofun/contracts';

function render(node: ReactNode) {
  return renderToString(<I18nProvider i18n={createI18n('en')}>{node}</I18nProvider>);
}

const noop = () => undefined;

describe('SettingsPanel', () => {
  it('groups every setting from plan 8.6', () => {
    const html = render(<SettingsPanel value={DEFAULT_PLAY_SETTINGS} onChange={noop} />);

    for (const label of [
      'Sound effects',
      'Music',
      'Spoken instructions',
      'Timers in challenges',
      'Reduce motion',
      'High contrast',
      'Dyslexia-friendly font',
      'Text size',
    ]) {
      expect(html).toContain(label);
    }
    expect(html.match(/role="switch"/g)).toHaveLength(7);
  });

  it('offers the text sizes as percentages, with the current one chosen', () => {
    const html = render(
      <SettingsPanel value={{ ...DEFAULT_PLAY_SETTINGS, textScale: 1.25 }} onChange={noop} />,
    );

    expect(html).toContain('100%');
    expect(html).toContain('125%');
    expect(html).toContain('150%');
    expect(
      /<input[^>]*checked=""[^>]*value="1.25"|<input[^>]*value="1.25"[^>]*checked=""/.test(html),
    ).toBe(true);
  });

  it('shows each setting as it is', () => {
    const html = render(
      <SettingsPanel
        value={{ ...DEFAULT_PLAY_SETTINGS, music: false, timers: false }}
        onChange={noop}
      />,
    );

    // Sound and voice are on; music and timers are off; the four other switches are off by default.
    expect(html.match(/role="switch"[^>]*checked=""/g)).toHaveLength(2);
  });
});
