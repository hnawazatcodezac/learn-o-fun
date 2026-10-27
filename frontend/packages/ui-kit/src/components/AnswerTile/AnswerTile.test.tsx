import { createI18n } from '@learnofun/i18n';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { AnswerTile } from './AnswerTile';
import { renderMarkup } from '../../test/markup';

function render(node: ReactNode) {
  return renderMarkup(<I18nProvider i18n={createI18n('en')}>{node}</I18nProvider>);
}

describe('AnswerTile', () => {
  it('is a button inside the shared lf-answer classes, a number by default (ADR 0020)', () => {
    expect(render(<AnswerTile>12</AnswerTile>)).toBe(
      '<div class="lf-answer lf-answer--number"><button type="button" class="lf-answer__tile">12</button><span class="lf-answer__state"></span></div>',
    );
  });

  it('sets words in the word style', () => {
    expect(render(<AnswerTile content="word">cat</AnswerTile>)).toContain(
      'class="lf-answer lf-answer--word"',
    );
  });

  it('says "Correct" and "Try again" in words, beside the tile', () => {
    const correct = render(<AnswerTile state="correct">12</AnswerTile>);
    const tryAgain = render(<AnswerTile state="tryAgain">14</AnswerTile>);

    expect(correct).toContain('lf-answer--correct');
    expect(correct).toContain('<span class="lf-answer__state">Correct</span>');
    expect(tryAgain).toContain('lf-answer--try-again');
    expect(tryAgain).toContain('<span class="lf-answer__state">Try again</span>');
  });

  it('marks a selected tile as pressed', () => {
    const html = render(<AnswerTile state="selected">13</AnswerTile>);

    expect(html).toContain('lf-answer--selected');
    expect(html).toContain('aria-pressed="true"');
  });

  it('disables a tile a hint has ruled out', () => {
    const html = render(<AnswerTile state="ruledOut">11</AnswerTile>);

    expect(html).toContain('lf-answer--ruled-out');
    expect(html).toContain('disabled=""');
  });
});
