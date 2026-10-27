import { createI18n } from '@learnofun/i18n';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { ProgressTrail } from './ProgressTrail';
import { renderMarkup } from '../../test/markup';

function render(node: ReactNode) {
  return renderMarkup(<I18nProvider i18n={createI18n('en')}>{node}</I18nProvider>);
}

const states = (html: string) =>
  [...html.matchAll(/lf-trail__step--(\w+)/g)].map((match) => match[1]);

describe('ProgressTrail', () => {
  it('reads as one image to screen readers: the question the child is on', () => {
    const html = render(<ProgressTrail done={5} total={8} />);

    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Question 6 of 8"');
  });

  it('shows the same count beside the trail, hidden from screen readers', () => {
    expect(render(<ProgressTrail done={5} total={8} />)).toContain(
      '<span class="lf-trail__count" aria-hidden="true">6 of 8</span>',
    );
  });

  it('draws a dot per item, done, then current, then still to come, and ends in a star', () => {
    const html = render(<ProgressTrail done={2} total={5} />);

    expect(states(html)).toEqual(['done', 'done', 'current', 'next', 'next', 'finish']);
  });

  it('marks finished steps with a check, so the trail never relies on colour alone', () => {
    const html = render(<ProgressTrail done={2} total={5} />);

    // Two checks on the finished steps, and the star at the end.
    expect(html.match(/class="lf-icon"/g)).toHaveLength(3);
  });

  it('stays on the last question once every step is done, and keeps counts in range', () => {
    const finished = render(<ProgressTrail done={6} total={6} />);

    expect(states(finished)).toEqual(['done', 'done', 'done', 'done', 'done', 'done', 'finish']);
    expect(finished).toContain('aria-label="Question 6 of 6"');
    expect(render(<ProgressTrail done={9} total={4} />)).toContain('aria-label="Question 4 of 4"');
    expect(render(<ProgressTrail done={-1} total={4} />)).toContain('aria-label="Question 1 of 4"');
  });
});
