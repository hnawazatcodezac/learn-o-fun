import { createI18n } from '@learnofun/i18n';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { ToastProvider, useToast } from './Toast';
import { renderMarkup } from '../../test/markup';

function render(node: ReactNode) {
  return renderMarkup(<I18nProvider i18n={createI18n('en')}>{node}</I18nProvider>);
}

describe('ToastProvider', () => {
  it('always renders a polite status region, so new messages are announced', () => {
    expect(render(<ToastProvider>{null}</ToastProvider>)).toContain(
      '<div class="lf-toast-region" role="status"></div>',
    );
  });

  it('shows starting messages, each with a named close button', () => {
    const html = render(
      <ToastProvider initialMessages={['Settings saved', 'Goal updated']}>{null}</ToastProvider>,
    );

    expect(html).toContain('Settings saved');
    expect(html).toContain('Goal updated');
    expect(html.match(/aria-label="Dismiss message"/g)).toHaveLength(2);
  });
});

describe('useToast', () => {
  it('refuses to work outside ToastProvider', () => {
    function Orphan() {
      useToast();
      return null;
    }

    expect(() => render(<Orphan />)).toThrow('useToast must be used inside ToastProvider');
  });
});
