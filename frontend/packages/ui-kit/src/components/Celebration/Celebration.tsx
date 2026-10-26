import type { ReactNode } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { StarIcon } from '../icons';

const BURST_PIECES = 8;

export interface CelebrationProps {
  open: boolean;
  /** Shows the celebration in place instead of over the screen, for previews and in-page use. */
  inline?: boolean;
  /** The way on, such as a Back to my games button. */
  children?: ReactNode;
}

/**
 * The end-of-session cheer, in play-hero, announced to screen readers. The burst is coral
 * decoration that ends within 1.2 seconds and turns off under reduced motion (design system
 * README, Motion). It counts nothing: no score, no stars earned.
 */
export function Celebration({ open, inline = false, children }: CelebrationProps) {
  const { t } = useI18n();

  return (
    <div
      className={`lf-celebration-region${inline ? ' lf-celebration-region--inline' : ''}`}
      role="status"
    >
      {open && (
        <div className="lf-celebration">
          <span className="lf-celebration__burst" aria-hidden="true">
            {Array.from({ length: BURST_PIECES }, (_, index) => (
              <span key={index} className="lf-celebration__piece" />
            ))}
          </span>
          <span className="lf-celebration__badge">
            <StarIcon />
          </span>
          <p className="lf-celebration__message">{t('ui.celebration.message')}</p>
          {children}
        </div>
      )}
    </div>
  );
}
