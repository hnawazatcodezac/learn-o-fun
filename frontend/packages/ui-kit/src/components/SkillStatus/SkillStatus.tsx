import type { SkillStatus as SkillStatusId } from '@learnofun/contracts';
import type { ReactNode } from 'react';
import { useI18n } from '../../i18n/useI18n';

/**
 * The progress-pie icons drawn in the SkillStatus spec (ADR 0019): an empty circle, then a
 * quarter, a half, three quarters and a full circle with a check, and a loop arrow for review.
 */
const ICONS: Record<SkillStatusId, ReactNode> = {
  'not-started': <circle className="lf-skill-status__ring" cx="8" cy="8" r="6" />,
  exploring: (
    <>
      <circle className="lf-skill-status__ring" cx="8" cy="8" r="6" />
      <path d="M8 8V2a6 6 0 0 1 6 6z" />
    </>
  ),
  building: (
    <>
      <circle className="lf-skill-status__ring" cx="8" cy="8" r="6" />
      <path d="M8 2a6 6 0 0 1 0 12z" />
    </>
  ),
  strong: (
    <>
      <circle className="lf-skill-status__ring" cx="8" cy="8" r="6" />
      <path d="M8 8V2a6 6 0 1 1-6 6z" />
    </>
  ),
  mastered: (
    <>
      <circle cx="8" cy="8" r="7" />
      <path className="lf-skill-status__check" d="M4.8 8.2l2.1 2.1 4.3-4.4" />
    </>
  ),
  'review-due': (
    <>
      <path className="lf-skill-status__line" d="M3 8a5 5 0 1 0 1.5-3.6" />
      <path className="lf-skill-status__line" d="M3 2.5v3h3" />
    </>
  ),
};

export interface SkillStatusProps {
  /** The skill's status, from the learner model. */
  status: SkillStatusId;
  /** Not enough evidence yet: the status shows with "Early signal" beside it. */
  earlySignal?: boolean;
}

/**
 * A chip that tells a parent where a child is with one skill (docs/design-system/components/
 * SkillStatus). The icon and the word carry the meaning, so it works without colour. Parent
 * dashboard only: never in the child app, and never a score, grade or percentage.
 */
export function SkillStatus({ status, earlySignal = false }: SkillStatusProps) {
  const { t } = useI18n();

  return (
    <span className={`lf-skill-status lf-skill-status--${status}`}>
      <span className="lf-skill-status__chip">
        <svg
          className="lf-skill-status__icon"
          viewBox="0 0 16 16"
          aria-hidden="true"
          focusable="false"
        >
          {ICONS[status]}
        </svg>
        {t(`ui.skillStatus.${status}`)}
      </span>
      {earlySignal && (
        <span className="lf-skill-status__early">{t('ui.skillStatus.earlySignal')}</span>
      )}
    </span>
  );
}
