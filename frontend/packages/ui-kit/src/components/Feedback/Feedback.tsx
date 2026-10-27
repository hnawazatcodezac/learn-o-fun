import type { ReactNode } from 'react';
import { cn } from '../../cn';
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

/** A soft tint with its ink, and a badge in the bright fill. Never red, and never a cross. */
const KIND_CLASSES: Record<FeedbackKind, { banner: string; badge: string }> = {
  correct: { banner: 'lf-feedback--correct bg-leaf-soft text-leaf-ink', badge: 'bg-leaf' },
  tryAgain: { banner: 'lf-feedback--tryAgain bg-sun-soft text-sun-ink', badge: 'bg-sun' },
  hint: { banner: 'lf-feedback--hint bg-sky-soft text-sky-ink', badge: 'bg-sky' },
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
 * announced as a status (docs/design-system/components/Feedback). The badge's 44px and the 560px
 * measure come from the spec's bundle.css, which the READMEs leave open (ADR 0019). It shows an icon and words, never colour alone, and never red, a cross,
 * "Wrong" or a count of mistakes. Whoever shows it keeps it up for about 1.5 seconds, or until
 * the child taps. Sound comes from the game shell's audio manager.
 */
export function Feedback({ kind, open, message, detail, inline = false }: FeedbackProps) {
  const { t } = useI18n();
  const Icon = ICONS[kind];

  return (
    <div
      className={cn(
        'lf-feedback-region pointer-events-none fixed inset-0 z-20 grid place-items-center px-4',
        inline && 'lf-feedback-region--inline static block px-0',
      )}
      role="status"
    >
      {open && (
        <div
          className={cn(
            'lf-feedback pointer-events-auto box-border flex animate-ui-feedback items-center gap-4 rounded-lg px-5 py-4 inline-full max-inline-ui-feedback',
            KIND_CLASSES[kind].banner,
            inline ? 'shadow-none' : 'shadow-lg',
          )}
        >
          <span
            className={cn(
              'lf-feedback__badge grid flex-none place-items-center rounded-full text-on-bright block-ui-feedback-badge inline-ui-feedback-badge',
              KIND_CLASSES[kind].badge,
            )}
          >
            <Icon />
          </span>
          <p className="lf-feedback__message m-0 flex flex-col font-display text-play-label">
            {message ?? t(`ui.feedback.${kind}`)}
            {/* The second line: never below 20px for children, at the spec's weight 500 in ink. */}
            {detail !== undefined && (
              <span className="lf-feedback__detail font-second-line text-ink">{detail}</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
