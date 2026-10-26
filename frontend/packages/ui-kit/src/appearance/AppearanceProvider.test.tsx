import { PauseIcon as PhosphorPause } from '@phosphor-icons/react/dist/csr/Pause';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PauseIcon } from '../components/icons';
import { AppearanceProvider } from './AppearanceProvider';

/** The drawing inside an icon's <svg>, which is what its weight changes. */
const drawing = (html: string) => html.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

describe('AppearanceProvider icons (ADR 0019)', () => {
  it('draws icons Bold in the Play world, on a page with a band', () => {
    const html = renderToString(
      <AppearanceProvider band="early-primary">
        <PauseIcon />
      </AppearanceProvider>,
    );

    expect(drawing(html)).toBe(drawing(renderToString(<PhosphorPause weight="bold" />)));
  });

  it('draws icons Regular in the Family world, on a page without one', () => {
    const html = renderToString(
      <AppearanceProvider>
        <PauseIcon />
      </AppearanceProvider>,
    );

    expect(drawing(html)).toBe(drawing(renderToString(<PhosphorPause weight="regular" />)));
    expect(drawing(html)).not.toBe(drawing(renderToString(<PhosphorPause weight="bold" />)));
  });
});
