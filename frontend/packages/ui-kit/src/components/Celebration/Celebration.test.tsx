import { createI18n } from '@learnofun/i18n';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { Celebration } from './Celebration';
import { renderMarkup } from '../../test/markup';

function render(node: ReactNode) {
  return renderMarkup(<I18nProvider i18n={createI18n('en')}>{node}</I18nProvider>);
}

describe('Celebration', () => {
  it('keeps an empty status region while closed, so the cheer is announced', () => {
    expect(render(<Celebration open={false} />)).toBe(
      '<div class="lf-celebration-region" role="status"></div>',
    );
  });

  it('cheers with a star and words, and a decorative burst', () => {
    const html = render(<Celebration open />);

    expect(html).toContain('<p class="lf-celebration__message">You did it!</p>');
    expect(html).toContain('<span class="lf-celebration__badge"><svg');
    expect(html).toContain('<span class="lf-celebration__burst" aria-hidden="true">');
  });

  it('holds the way on', () => {
    expect(render(<Celebration open>{<button type="button">Back</button>}</Celebration>)).toContain(
      '<button type="button">Back</button>',
    );
  });
});
