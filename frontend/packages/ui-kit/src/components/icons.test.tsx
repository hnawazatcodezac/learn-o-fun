import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PinPicture } from './PicturePin/PinPicture';
import * as icons from './icons';

const ICONS = Object.entries(icons).flatMap(([name, value]) =>
  name.endsWith('Icon') && typeof value === 'function' ? [[name, value] as const] : [],
);

describe('Learnofun’s icons (ADR 0045)', () => {
  it.each(ICONS)('%s is a decorative line drawing on the 24-pixel grid', (_, Icon) => {
    const html = renderToString(<Icon />);

    expect(html).toMatch(/^<svg [^>]*viewBox="0 0 24 24"/);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('stroke-linecap="round"');
    expect(html).toContain('class="lf-icon ');
  });

  it('takes a size for a mark inside a badge, in place of the world’s', () => {
    const html = renderToString(<icons.CheckIcon className="block-4 inline-4" />);

    expect(html).toMatch(/class="[^"]*block-4[^"]*"/);
    expect(html).toMatch(/class="[^"]*inline-4[^"]*"/);
    expect(html).not.toContain('inline-ui-icon');
    expect(html).not.toContain('block-ui-icon');
  });

  it('turns round right to left the icons that point along the line of text', () => {
    for (const Icon of [icons.NextIcon, icons.BackIcon, icons.DeleteIcon, icons.SignInIcon]) {
      expect(renderToString(<Icon />)).toContain('rtl:-scale-x-100');
    }
    expect(renderToString(<icons.RetryIcon />)).not.toContain('rtl:-scale-x-100');
  });

  it('draws every picture-PIN picture as its own coloured shape', () => {
    const pictures = [
      'sun',
      'moon',
      'star',
      'heart',
      'cloud',
      'flower',
      'fish',
      'leaf',
      'drop',
    ] as const;
    const drawings = pictures.map((picture) =>
      renderToString(<PinPicture picture={picture} />).replace(/^<svg[^>]*>/, ''),
    );

    expect(new Set(drawings).size).toBe(pictures.length);
    for (const drawing of drawings) expect(drawing).toMatch(/fill-[a-z]/);
  });
});
