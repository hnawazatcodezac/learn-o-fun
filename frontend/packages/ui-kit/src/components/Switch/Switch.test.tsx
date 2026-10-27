import { describe, expect, it } from 'vitest';
import { Switch } from './Switch';
import { renderMarkup } from '../../test/markup';

const noop = () => undefined;

describe('Switch', () => {
  it('is a labelled checkbox with the switch role', () => {
    const html = renderMarkup(<Switch label="Music" checked={false} onChange={noop} />);

    expect(html).toMatch(/<label class="lf-switch"><input type="checkbox" role="switch"/);
    expect(html).toContain('<span class="lf-switch__label">Music</span>');
    expect(html).not.toContain('checked=""');
  });

  it('shows its state', () => {
    expect(renderMarkup(<Switch label="Music" checked onChange={noop} />)).toContain('checked=""');
  });
});
