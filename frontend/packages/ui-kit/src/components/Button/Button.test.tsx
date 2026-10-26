import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PauseIcon } from '../icons';
import { Button } from './Button';

describe('Button', () => {
  it('renders a primary button that does not submit forms by default', () => {
    expect(renderToString(<Button>Start</Button>)).toBe(
      '<button type="button" class="lf-button lf-button--primary"><span class="lf-button__label">Start</span></button>',
    );
  });

  it('renders the secondary variant', () => {
    expect(renderToString(<Button variant="secondary">Not now</Button>)).toContain(
      'class="lf-button lf-button--secondary"',
    );
  });

  it('puts a leading icon before the label, hidden from screen readers', () => {
    const html = renderToString(<Button icon={<PauseIcon />}>Pause</Button>);

    expect(html).toMatch(
      /^<button[^>]*><svg[^>]*class="lf-icon"[^>]*aria-hidden="true"[^>]*>.*<\/svg><span class="lf-button__label">Pause<\/span><\/button>$/,
    );
  });

  it('passes through button attributes', () => {
    const html = renderToString(
      <Button type="submit" disabled aria-describedby="hint">
        Start
      </Button>,
    );

    expect(html).toContain('type="submit"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-describedby="hint"');
  });
});
