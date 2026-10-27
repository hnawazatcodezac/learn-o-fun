import { createI18n } from '@learnofun/i18n';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { AVATARS, Avatar } from './Avatar';
import { AvatarPicker } from './AvatarPicker';
import { renderMarkup } from '../../test/markup';

function render(node: ReactNode) {
  return renderMarkup(<I18nProvider i18n={createI18n('en')}>{node}</I18nProvider>);
}

const noop = () => undefined;

describe('AvatarPicker', () => {
  it('is a labelled group of radio buttons, one per avatar', () => {
    const html = render(
      <AvatarPicker label="Choose your picture" value={undefined} onChange={noop} />,
    );

    expect(html).toContain('<legend class="lf-avatar-picker__legend">Choose your picture</legend>');
    expect(html.match(/type="radio"/g)).toHaveLength(AVATARS.length);
  });

  it('reads out a hint with the group’s name when given one', () => {
    expect(
      render(<AvatarPicker label="Picture" value={undefined} onChange={noop} describedBy="hint" />),
    ).toContain('<fieldset class="lf-avatar-picker" aria-describedby="hint">');
    expect(
      render(<AvatarPicker label="Picture" value={undefined} onChange={noop} />),
    ).not.toContain('aria-describedby');
  });

  it('gives every avatar a name from the catalog', () => {
    const html = render(<AvatarPicker label="Pick" value={undefined} onChange={noop} />);

    for (const name of ['Circle', 'Square', 'Triangle', 'Star', 'Heart', 'Diamond']) {
      expect(html).toContain(name);
    }
  });

  it('checks the chosen avatar only', () => {
    const html = render(<AvatarPicker label="Pick" value="purple-star" onChange={noop} />);

    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(/<input[^>]*checked=""[^>]*>/.exec(html)?.[0]).toContain('value="purple-star"');
  });

  it('can offer a subset of avatars', () => {
    const html = render(
      <AvatarPicker
        label="Pick"
        value={undefined}
        onChange={noop}
        avatars={['blue-square', 'pink-heart']}
      />,
    );

    expect(html.match(/type="radio"/g)).toHaveLength(2);
  });
});

describe('Avatar', () => {
  it('is decorative, so whatever shows it supplies the name', () => {
    expect(renderMarkup(<Avatar id="teal-diamond" />)).toMatch(
      /^<svg class="lf-avatar lf-avatar--teal-diamond"[^>]*aria-hidden="true"/,
    );
  });
});
