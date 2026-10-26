import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Switch } from './Switch';

const noop = () => undefined;

describe('Switch', () => {
  it('is a labelled checkbox with the switch role', () => {
    const html = renderToString(<Switch label="Music" checked={false} onChange={noop} />);

    expect(html).toMatch(/<label class="lf-switch"><input type="checkbox" role="switch"/);
    expect(html).toContain('<span class="lf-switch__label">Music</span>');
    expect(html).not.toContain('checked=""');
  });

  it('shows its state', () => {
    expect(renderToString(<Switch label="Music" checked onChange={noop} />)).toContain(
      'checked=""',
    );
  });
});
