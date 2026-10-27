import type { ReactNode } from 'react';
import { cn } from '../../cn';
import { useI18n } from '../../i18n/useI18n';
import { StarIcon } from '../icons';

/** Eight pieces, an eighth of a turn apart. */
const PIECE_CLASSES = [
  'rotate-0',
  'rotate-45',
  'rotate-90',
  'rotate-135',
  'rotate-180',
  'rotate-225',
  'rotate-270',
  'rotate-315',
];

export interface CelebrationProps {
  open: boolean;
  /** Shows the celebration in place instead of over the screen, for previews and in-page use. */
  inline?: boolean;
  /** The way on, such as a Back to my games button. */
  children?: ReactNode;
}

/**
 * The end-of-session cheer, in play-hero, announced to screen readers: a card that floats on
 * shadow-lg, with coral for the celebration. The burst is coral decoration that ends within 1.2
 * seconds and turns off under reduced motion (design system README, Motion). It counts nothing:
 * no score, no stars earned.
 */
export function Celebration({ open, inline = false, children }: CelebrationProps) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'lf-celebration-region pointer-events-none fixed inset-0 z-20 grid place-items-center px-4',
        inline && 'lf-celebration-region--inline static block px-0',
      )}
      role="status"
    >
      {open && (
        <div
          className={cn(
            'lf-celebration pointer-events-auto relative flex animate-ui-celebration flex-col items-center gap-4 rounded-lg bg-surface-raised p-ui-card text-center text-ink',
            inline ? 'shadow-none' : 'shadow-lg',
          )}
        >
          <span
            className="lf-celebration__burst absolute inset-s-1/2 inset-bs-ui-burst-top"
            aria-hidden="true"
          >
            {/* Each piece flies out along its own turn, which the span around it sets. */}
            {PIECE_CLASSES.map((turn) => (
              <span key={turn} className={cn('absolute block-3 inline-3', turn)}>
                <span className="lf-celebration__piece block animate-ui-burst rounded-full bg-coral opacity-0 block-3 inline-3" />
              </span>
            ))}
          </span>
          <span className="lf-celebration__badge grid place-items-center rounded-full bg-coral text-on-bright block-8 inline-8">
            {/* The README's largest icon size, for the session's one big moment. */}
            <StarIcon className="block-6 inline-6" />
          </span>
          <p className="lf-celebration__message m-0 font-display text-play-hero">
            {t('ui.celebration.message')}
          </p>
          {children}
        </div>
      )}
    </div>
  );
}
