import { describe, expect, it } from 'vitest';
import { PauseIcon } from '../icons';
import { Button } from './Button';
import { renderMarkup } from '../../test/markup';

describe('Button', () => {
  it('renders a primary button that does not submit forms by default', () => {
    expect(renderMarkup(<Button>Start</Button>)).toBe(
      '<button type="button" class="lf-button lf-button--primary"><span class="lf-button__label">Start</span></button>',
    );
  });

  it('renders the secondary variant', () => {
    expect(renderMarkup(<Button variant="secondary">Not now</Button>)).toContain(
      'class="lf-button lf-button--secondary"',
    );
  });

  it('puts a leading icon before the label, hidden from screen readers', () => {
    const html = renderMarkup(<Button icon={<PauseIcon />}>Pause</Button>);

    expect(html).toMatch(
      /^<button[^>]*><svg(?=[^>]*aria-hidden="true")[^>]*class="lf-icon"[^>]*>.*<\/svg><span class="lf-button__label">Pause<\/span><\/button>$/,
    );
  });

  it('passes through button attributes', () => {
    const html = renderMarkup(
      <Button type="submit" disabled aria-describedby="hint">
        Start
      </Button>,
    );

    expect(html).toContain('type="submit"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-describedby="hint"');
  });
});
