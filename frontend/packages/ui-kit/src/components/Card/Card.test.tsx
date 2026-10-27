import { describe, expect, it } from 'vitest';
import { Card } from './Card';
import { renderMarkup } from '../../test/markup';

describe('Card', () => {
  it('is a section labelled by its heading', () => {
    const html = renderMarkup(<Card title="Today">Body</Card>);
    const headingId = /<h2 id="([^"]+)"/.exec(html)?.[1];

    expect(headingId).toBeDefined();
    expect(html).toContain(`<section class="lf-card" aria-labelledby="${String(headingId)}">`);
  });

  it('uses the requested heading level', () => {
    expect(renderMarkup(<Card title="Today" headingLevel={3} />)).toMatch(/<h3 [^>]*>Today<\/h3>/);
  });

  it('renders the body only when there is one', () => {
    expect(renderMarkup(<Card title="Today" />)).not.toContain('lf-card__body');
    expect(renderMarkup(<Card title="Today">Body</Card>)).toContain(
      '<div class="lf-card__body">Body</div>',
    );
  });
});
