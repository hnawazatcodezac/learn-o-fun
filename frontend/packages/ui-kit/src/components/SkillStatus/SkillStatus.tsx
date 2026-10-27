import type { SkillStatus as SkillStatusId } from '@learnofun/contracts';
import type { ReactNode } from 'react';
import { cn } from '../../cn';
import { useI18n } from '../../i18n/useI18n';

/** The outline parts of an icon, drawn in the chip's ink. */
const LINE_CLASSES = 'fill-none stroke-current stroke-2';

/**
 * The progress-pie icons drawn in the SkillStatus spec (ADR 0019): an empty circle, then a
 * quarter, a half, three quarters and a full circle with a check, and a loop arrow for review.
 */
const ICONS: Record<SkillStatusId, ReactNode> = {
  'not-started': (
    <circle className={cn('lf-skill-status__ring', LINE_CLASSES)} cx="8" cy="8" r="6" />
  ),
  exploring: (
    <>
      <circle className={cn('lf-skill-status__ring', LINE_CLASSES)} cx="8" cy="8" r="6" />
      <path d="M8 8V2a6 6 0 0 1 6 6z" />
    </>
  ),
  building: (
    <>
      <circle className={cn('lf-skill-status__ring', LINE_CLASSES)} cx="8" cy="8" r="6" />
      <path d="M8 2a6 6 0 0 1 0 12z" />
    </>
  ),
  strong: (
    <>
      <circle className={cn('lf-skill-status__ring', LINE_CLASSES)} cx="8" cy="8" r="6" />
      <path d="M8 8V2a6 6 0 1 1-6 6z" />
    </>
  ),
  mastered: (
    <>
      <circle cx="8" cy="8" r="7" />
      {/* The check is cut out of the full circle, in the chip's tint. */}
      <path
        className="lf-skill-status__check fill-none stroke-leaf-soft stroke-2"
        d="M4.8 8.2l2.1 2.1 4.3-4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  'review-due': (
    <>
      <path
        className={cn('lf-skill-status__line', LINE_CLASSES)}
        d="M3 8a5 5 0 1 0 1.5-3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className={cn('lf-skill-status__line', LINE_CLASSES)}
        d="M3 2.5v3h3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
};

/** Each status's tint and ink. */
const STATUS_CLASSES: Record<SkillStatusId, { status: string; chip: string }> = {
  'not-started': {
    status: 'lf-skill-status--not-started',
    chip: 'bg-surface-sunken text-ink-muted',
  },
  exploring: { status: 'lf-skill-status--exploring', chip: 'bg-sky-soft text-sky-ink' },
  building: { status: 'lf-skill-status--building', chip: 'bg-sun-soft text-sun-ink' },
  strong: { status: 'lf-skill-status--strong', chip: 'bg-teal-soft text-teal-ink' },
  mastered: { status: 'lf-skill-status--mastered', chip: 'bg-leaf-soft text-leaf-ink' },
  'review-due': { status: 'lf-skill-status--review-due', chip: 'bg-coral-soft text-coral-ink' },
};

export interface SkillStatusProps {
  /** The skill's status, from the learner model. */
  status: SkillStatusId;
  /** Not enough evidence yet: the status shows with "Early signal" beside it. */
  earlySignal?: boolean;
}

/**
 * A chip that tells a parent where a child is with one skill (docs/design-system/components/
 * SkillStatus): a pill in radius-full, family-small at weight 500, with a 16px icon. The 28px
 * height, the padding and the 6px gap come from the spec's bundle.css, which the READMEs leave
 * open (ADR 0019). The icon and the word carry the meaning, so it works without colour. Parent
 * dashboard only: never in the child app, and never a score, grade or percentage.
 */
export function SkillStatus({ status, earlySignal = false }: SkillStatusProps) {
  const { t } = useI18n();

  return (
    <span
      className={cn(
        'lf-skill-status inline-flex flex-wrap items-center gap-2',
        STATUS_CLASSES[status].status,
      )}
    >
      <span
        className={cn(
          'lf-skill-status__chip inline-flex items-center gap-ui-status-gap rounded-full ps-2 pe-3 font-sans text-family-small font-second-line min-block-ui-status-height',
          STATUS_CLASSES[status].chip,
        )}
      >
        <svg
          className="lf-skill-status__icon flex-none fill-current block-4 inline-4"
          viewBox="0 0 16 16"
          aria-hidden="true"
          focusable="false"
        >
          {ICONS[status]}
        </svg>
        {t(`ui.skillStatus.${status}`)}
      </span>
      {earlySignal && (
        // Not enough evidence yet (plan, parent area rules).
        <span className="lf-skill-status__early font-sans text-family-small text-ink-muted">
          {t('ui.skillStatus.earlySignal')}
        </span>
      )}
    </span>
  );
}
