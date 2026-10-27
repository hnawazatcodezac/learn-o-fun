import { SKILL_STATUSES } from '@learnofun/contracts';
import { createI18n } from '@learnofun/i18n';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { SkillStatus } from './SkillStatus';
import { renderMarkup } from '../../test/markup';

function render(node: ReactNode) {
  return renderMarkup(<I18nProvider i18n={createI18n('en')}>{node}</I18nProvider>);
}

describe('SkillStatus', () => {
  it.each([
    ['not-started', 'Not started'],
    ['exploring', 'Exploring'],
    ['building', 'Building'],
    ['strong', 'Strong'],
    ['mastered', 'Mastered'],
    ['review-due', 'Review due'],
  ] as const)('names %s with its icon and the design system’s word', (status, word) => {
    const html = render(<SkillStatus status={status} />);

    expect(html).toContain(`lf-skill-status--${status}`);
    expect(html).toMatch(new RegExp(`<svg[^>]*aria-hidden="true"[^>]*>.*</svg>${word}</span>`));
  });

  it('covers every status the learner model has', () => {
    for (const status of SKILL_STATUSES) {
      expect(render(<SkillStatus status={status} />)).toContain('<svg');
    }
  });

  it('says "Early signal" beside the chip when there is not enough evidence', () => {
    expect(render(<SkillStatus status="exploring" earlySignal />)).toContain(
      '<span class="lf-skill-status__early">Early signal</span>',
    );
    expect(render(<SkillStatus status="exploring" />)).not.toContain('Early signal');
  });

  it('never shows a score, grade or percentage', () => {
    for (const status of SKILL_STATUSES) {
      expect(render(<SkillStatus status={status} earlySignal />)).not.toMatch(
        /\d+\s*%|score|grade/i,
      );
    }
  });
});
