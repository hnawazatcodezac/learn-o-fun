import { createI18n } from '@learnofun/i18n';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { Feedback } from './Feedback';
import { renderMarkup } from '../../test/markup';

function render(node: ReactNode) {
  return renderMarkup(<I18nProvider i18n={createI18n('en')}>{node}</I18nProvider>);
}

describe('Feedback', () => {
  it('keeps an empty status region while closed, so the next message is announced', () => {
    expect(render(<Feedback kind="correct" open={false} />)).toBe(
      '<div class="lf-feedback-region" role="status"></div>',
    );
  });

  it.each([
    ['correct', 'That’s it!'],
    ['tryAgain', 'Nearly. Have another go!'],
    ['hint', 'Here’s a hint.'],
  ] as const)('shows the %s message from the catalog with an icon', (kind, message) => {
    const html = render(<Feedback kind={kind} open />);

    expect(html).toContain(`lf-feedback lf-feedback--${kind}`);
    expect(html).toContain(message);
    expect(html).toContain('<span class="lf-feedback__badge"><svg');
  });

  it('shows a message and a second line that the caller gives', () => {
    const html = render(
      <Feedback kind="correct" open message="You counted on from 7." detail="7 + 5 = 12" />,
    );

    expect(html).toContain(
      '<p class="lf-feedback__message">You counted on from 7.<span class="lf-feedback__detail">7 + 5 = 12</span></p>',
    );
  });

  it('shows in place for previews', () => {
    expect(render(<Feedback kind="hint" open inline />)).toContain(
      'lf-feedback-region lf-feedback-region--inline',
    );
  });
});
