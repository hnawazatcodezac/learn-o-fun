import { createI18n } from '@learnofun/i18n';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { ParentalGate } from './ParentalGate';
import { renderMarkup } from '../../test/markup';

function render(node: ReactNode) {
  return renderMarkup(<I18nProvider i18n={createI18n('en')}>{node}</I18nProvider>);
}

const noop = () => undefined;

describe('ParentalGate', () => {
  it('asks a times-table question in words', () => {
    // random() = 0.5 picks the middle factor, six, for both.
    const html = render(
      <ParentalGate open mode="challenge" random={() => 0.5} onPass={noop} onCancel={noop} />,
    );

    expect(html).toContain('For grown-ups');
    expect(html).toContain('What is six times six?');
  });

  it('takes answers from a left-to-right number pad, never a text field', () => {
    const html = render(
      <ParentalGate open mode="challenge" random={() => 0.5} onPass={noop} onCancel={noop} />,
    );

    expect(html).toContain('role="group" aria-label="Number pad" dir="ltr"');
    expect(html.match(/class="lf-keypad__key[^"]*"/g)).toHaveLength(12);
    expect(html).not.toMatch(/<input|<textarea/);
  });

  it('asks for the parent PIN in PIN mode, showing digits as dots', () => {
    const html = render(
      <ParentalGate open mode="pin" verifyPin={() => false} onPass={noop} onCancel={noop} />,
    );

    expect(html).toContain('Enter your parent PIN.');
    expect(html).toContain('aria-label="No digits entered"');
    expect(html.match(/class="lf-gate__dot"/g)).toHaveLength(4);
  });

  it('renders no question while closed', () => {
    const html = render(
      <ParentalGate open={false} mode="challenge" onPass={noop} onCancel={noop} />,
    );

    expect(html).not.toContain('lf-gate');
  });
});
