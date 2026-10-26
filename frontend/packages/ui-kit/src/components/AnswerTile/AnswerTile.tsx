import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useI18n } from '../../i18n/useI18n';

/** The states of an answer tile (docs/design-system/components/AnswerTile). */
export const ANSWER_TILE_STATES = [
  'default',
  'selected',
  'correct',
  'tryAgain',
  'ruledOut',
] as const;

export type AnswerTileState = (typeof ANSWER_TILE_STATES)[number];

/** A number in play-number, or a word in read-early. */
export type AnswerTileContent = 'number' | 'word';

/** The modifier class for each state; DOM games use the same names (ADR 0020). */
const STATE_CLASS: Record<AnswerTileState, string> = {
  default: '',
  selected: ' lf-answer--selected',
  correct: ' lf-answer--correct',
  tryAgain: ' lf-answer--try-again',
  ruledOut: ' lf-answer--ruled-out',
};

export interface AnswerTileProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'style' | 'children' | 'content'
> {
  /** The answer: a number, a word, or a picture with its own accessible name. */
  children: ReactNode;
  state?: AnswerTileState;
  content?: AnswerTileContent;
}

/**
 * A large, pressable answer a child taps. Correct shows a check and "Correct"; try again shows a
 * loop arrow and "Try again", never red or a cross; a tile a hint has ruled out is disabled and
 * struck through. The look is the `lf-answer` classes, which DOM games use directly (ADR 0020).
 */
export function AnswerTile({
  children,
  state = 'default',
  content = 'number',
  type = 'button',
  disabled,
  ...rest
}: AnswerTileProps) {
  const { t } = useI18n();
  const words =
    state === 'correct'
      ? t('ui.answer.correct')
      : state === 'tryAgain'
        ? t('ui.answer.tryAgain')
        : undefined;

  return (
    <div className={`lf-answer lf-answer--${content}${STATE_CLASS[state]}`}>
      <button
        {...rest}
        type={type}
        className="lf-answer__tile"
        disabled={disabled === true || state === 'ruledOut'}
        aria-pressed={state === 'selected' ? true : rest['aria-pressed']}
      >
        {children}
      </button>
      <span className="lf-answer__state">{words}</span>
    </div>
  );
}
