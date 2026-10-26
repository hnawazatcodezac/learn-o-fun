import type { ReactNode } from 'react';
import { useI18n } from '../../i18n/useI18n';
import { CheckIcon, HintIcon, RetryIcon } from '../icons';

/** The kinds of feedback after an answer (docs/design-system/components/Feedback). */
export const FEEDBACK_KINDS = ['correct', 'tryAgain', 'hint'] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

const ICONS: Record<FeedbackKind, () => ReactNode> = {
  correct: CheckIcon,
  tryAgain: RetryIcon,
  hint: HintIcon,
};

export interface FeedbackProps {
  kind: FeedbackKind;
  open: boolean;
  /** One line from the catalog: praise the strategy, or give a next step. Defaults to the kind's. */
  message?: string;
  /** An optional second line. */
  detail?: string;
  /** Shows the feedback in place instead of over the screen, for previews and in-page use. */
  inline?: boolean;
}

/**
 * The short message a child sees and hears straight after an answer: a soft banner with a badge,
 * announced as a status. It shows an icon and words, never colour alone, and never red, a cross,
 * "Wrong" or a count of mistakes. Whoever shows it keeps it up for about 1.5 seconds, or until
 * the child taps. Sound comes from the game shell's audio manager.
 */
export function Feedback({ kind, open, message, detail, inline = false }: FeedbackProps) {
  const { t } = useI18n();
  const Icon = ICONS[kind];

  return (
    <div
      className={`lf-feedback-region${inline ? ' lf-feedback-region--inline' : ''}`}
      role="status"
    >
      {open && (
        <div className={`lf-feedback lf-feedback--${kind}`}>
          <span className="lf-feedback__badge">
            <Icon />
          </span>
          <p className="lf-feedback__message">
            {message ?? t(`ui.feedback.${kind}`)}
            {detail !== undefined && <span className="lf-feedback__detail">{detail}</span>}
          </p>
        </div>
      )}
    </div>
  );
}
