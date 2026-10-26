import { createI18n } from '@learnofun/i18n';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { ActivityCard } from './ActivityCard';

function render(node: ReactNode) {
  return renderToString(<I18nProvider i18n={createI18n('en')}>{node}</I18nProvider>);
}

describe('ActivityCard', () => {
  it('is one button: the kind, the title and about how long it takes', () => {
    const html = render(<ActivityCard kind="review" title="Number bonds to 10" minutes={4} />);

    expect(html).toMatch(
      /^<button type="button" class="lf-activity-card lf-activity-card--review">/,
    );
    expect(html).toContain('<span class="lf-activity-card__kind">Review</span>');
    expect(html).toContain('<span class="lf-activity-card__title">Number bonds to 10</span>');
    expect(html).toContain('<span class="lf-activity-card__length">About 4 minutes</span>');
    expect(html.match(/<button/g)).toHaveLength(1);
  });

  it.each([
    ['review', 'Review'],
    ['new', 'New skill'],
    ['choice', 'Your choice'],
  ] as const)('names the %s kind in words', (kind, words) => {
    expect(render(<ActivityCard kind={kind} title="Hop to 20" minutes={6} />)).toContain(
      `<span class="lf-activity-card__kind">${words}</span>`,
    );
  });

  it('says one minute in the singular', () => {
    expect(render(<ActivityCard title="Hop to 20" minutes={1} />)).toContain('About 1 minute<');
  });

  it('shows no kind where there is no reason, with the free-choice art', () => {
    const html = render(<ActivityCard title="Tile Farm" minutes={5} />);

    expect(html).toContain('lf-activity-card--choice');
    expect(html).not.toContain('lf-activity-card__kind');
  });

  it('keeps its art from screen readers, and shows no score, stars or lock', () => {
    const html = render(<ActivityCard kind="new" title="Hop to 20" minutes={6} />);

    expect(html).toContain('<svg class="lf-activity-card__art"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toMatch(/score|star|lock|price/i);
  });
});
