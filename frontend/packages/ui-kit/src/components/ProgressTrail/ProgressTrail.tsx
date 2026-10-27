import { cn } from '../../cn';
import { useI18n } from '../../i18n/useI18n';
import { CheckIcon, StarIcon } from '../icons';

export interface ProgressTrailProps {
  /** Items finished so far. */
  done: number;
  /** Items in the session. */
  total: number;
}

type StepState = 'done' | 'current' | 'next';

/**
 * The dot sizes come from the spec's bundle.css, which the READMEs leave open (ADR 0019): 20px
 * steps, and the current step and the star at 32px.
 */
const STEP_CLASSES =
  'lf-trail__step box-border grid inline-ui-trail-dot block-ui-trail-dot flex-none place-items-center rounded-full transition-[background-color,box-shadow] duration-ui-medium';

const STATE_CLASSES: Record<StepState | 'finish', string> = {
  // Finished, whatever the answer: leaf with a check, so it never relies on colour alone.
  done: 'lf-trail__step--done bg-leaf text-on-bright',
  // Now: larger, in sun, ringed in sun-soft.
  current: 'lf-trail__step--current inline-6 block-6 bg-sun ring-4 ring-sun-soft',
  next: 'lf-trail__step--next border-3 border-line-strong bg-surface-raised',
  finish:
    'lf-trail__step--finish inline-6 block-6 border-3 border-line-strong bg-surface-raised text-ink-muted',
};

/**
 * How far through the session the child is (docs/design-system/components/ProgressTrail): a dot
 * per item, finished ones in leaf with a check, the current one larger in sun, those to come
 * hollow, and a star at the end. Every step counts, whatever the answer was, and there is no
 * timer. Screen readers hear one image, "Question 6 of 8". The same count shows beside the trail
 * from age 6; the band decides, in the stylesheet.
 */
export function ProgressTrail({ done, total }: ProgressTrailProps) {
  const { t } = useI18n();
  const finished = Math.min(Math.max(done, 0), total);
  const current = Math.min(finished + 1, total);
  const state = (index: number): StepState =>
    index < finished ? 'done' : index === finished ? 'current' : 'next';

  return (
    <div className="lf-trail flex flex-wrap items-center gap-3">
      <div
        className="lf-trail__steps flex items-center gap-2"
        role="img"
        aria-label={t('ui.progress.label', { current, total })}
      >
        {Array.from({ length: total }, (_, index) => (
          <span key={index} className={cn(STEP_CLASSES, STATE_CLASSES[state(index)])}>
            {/* A mark inside the dot, so smaller than an icon. */}
            {index < finished && <CheckIcon className="block-4 inline-4" />}
          </span>
        ))}
        <span className={cn(STEP_CLASSES, STATE_CLASSES.finish)}>
          <StarIcon className="block-5 inline-5" />
        </span>
      </div>
      {/* "6 of 8" from age 6; ages 3 to 5 see the dots only (README, experience bands). */}
      <span
        className="lf-trail__count font-display text-play-label whitespace-nowrap text-ink early-years:hidden"
        aria-hidden="true"
      >
        {t('ui.progress.count', { current, total })}
      </span>
    </div>
  );
}
