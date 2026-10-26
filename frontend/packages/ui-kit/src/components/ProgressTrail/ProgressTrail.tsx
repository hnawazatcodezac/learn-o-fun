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
    <div className="lf-trail">
      <div
        className="lf-trail__steps"
        role="img"
        aria-label={t('ui.progress.label', { current, total })}
      >
        {Array.from({ length: total }, (_, index) => (
          <span key={index} className={`lf-trail__step lf-trail__step--${state(index)}`}>
            {index < finished && <CheckIcon />}
          </span>
        ))}
        <span className="lf-trail__step lf-trail__step--finish">
          <StarIcon />
        </span>
      </div>
      <span className="lf-trail__count" aria-hidden="true">
        {t('ui.progress.count', { current, total })}
      </span>
    </div>
  );
}
