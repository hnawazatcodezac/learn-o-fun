import { createI18n } from '@learnofun/i18n';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { Dialog } from './Dialog';

function render(node: ReactNode) {
  return renderToString(<I18nProvider i18n={createI18n('en')}>{node}</I18nProvider>);
}

const noop = () => undefined;

describe('Dialog', () => {
  it('is a native dialog labelled by its title', () => {
    const html = render(
      <Dialog open={false} title="Time for a break?" onClose={noop}>
        Body
      </Dialog>,
    );
    const titleId = /<h2 id="([^"]+)"/.exec(html)?.[1];

    expect(titleId).toBeDefined();
    expect(html).toContain(`<dialog class="lf-dialog" aria-labelledby="${String(titleId)}">`);
  });

  it('stays closed until the browser opens it as a modal', () => {
    expect(render(<Dialog open title="Title" onClose={noop} />)).not.toMatch(/<dialog[^>]* open/);
  });

  it('has a close button named from the catalog', () => {
    expect(render(<Dialog open={false} title="Title" onClose={noop} />)).toContain(
      'aria-label="Close"',
    );
  });
});
