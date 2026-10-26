import { createI18n } from '@learnofun/i18n';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { PicturePinPad } from './PicturePinPad';

const noop = () => undefined;

function render(value: Parameters<typeof PicturePinPad>[0]['value']) {
  return renderToString(
    <I18nProvider i18n={createI18n('en')}>
      <PicturePinPad value={value} onChange={noop} label="Ari’s picture PIN" />
    </I18nProvider>,
  );
}

describe('PicturePinPad', () => {
  it('offers nine named pictures as buttons, never a text field', () => {
    const html = render([]);

    expect(html).toContain('role="group" aria-label="Ari’s picture PIN"');
    expect(html.match(/class="lf-pin__picture"/g)).toHaveLength(9);
    for (const name of [
      'Sun',
      'Moon',
      'Star',
      'Heart',
      'Cloud',
      'Flower',
      'Fish',
      'Leaf',
      'Raindrop',
    ]) {
      expect(html).toContain(`aria-label="${name}"`);
    }
    expect(html).not.toMatch(/<input|<textarea/);
  });

  it('fills a slot for each picture chosen, and says how many', () => {
    const html = render(['sun', 'fish']);

    expect(html.match(/lf-pin__slot--filled/g)).toHaveLength(2);
    expect(html).toContain('2 of 3 pictures chosen');
  });

  it('can delete only once something is chosen, and takes no fourth picture', () => {
    expect(render([])).toMatch(/aria-label="Delete" disabled=""/);
    const full = render(['sun', 'fish', 'star']);
    expect(full).not.toMatch(/aria-label="Delete" disabled=""/);
    expect(full.match(/class="lf-pin__picture" aria-label="[^"]+" disabled=""/g)).toHaveLength(9);
  });
});
