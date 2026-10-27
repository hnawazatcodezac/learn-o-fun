import { useId, useState } from 'react';
import type { GateMode } from '../../appearance/bands';
import { cn } from '../../cn';
import { useI18n } from '../../i18n/useI18n';
import { Dialog } from '../Dialog/Dialog';
import { DeleteIcon } from '../icons';
import { DISABLED_CLASSES, FOCUS_CLASSES, PLAY_PIECE_CLASSES } from '../pieces';
import { isGateAnswer, makeGateQuestion, type GateFactor } from './question';

/** The catalog key for each factor written as a word, such as "seven". */
const NUMBER_WORDS = {
  3: 'ui.gate.numbers.3',
  4: 'ui.gate.numbers.4',
  5: 'ui.gate.numbers.5',
  6: 'ui.gate.numbers.6',
  7: 'ui.gate.numbers.7',
  8: 'ui.gate.numbers.8',
  9: 'ui.gate.numbers.9',
} as const satisfies Record<GateFactor, string>;

const ANSWER_DIGITS = 2;
const PIN_DIGITS = 4;
const KEYPAD_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const GATE_CLASSES = 'lf-gate flex flex-col gap-3 [&>p]:m-0';

const PROMPT_CLASSES = 'lf-gate__prompt font-ui-heading text-ui-heading';

const ENTRY_CLASSES =
  'lf-gate__entry flex min-block-ui-target items-center justify-center gap-3 rounded-ui border-2 border-line-strong bg-surface-sunken font-ui-title text-size-ui-title tabular-nums';

const MESSAGE_CLASSES = 'lf-gate__message font-label text-ink';

/** In the Play world, the keys are play pieces. */
const KEY_CLASSES = cn(
  'lf-keypad__key grid cursor-pointer place-items-center rounded-ui border-2 border-line-strong bg-surface-raised p-0 font-ui-label text-ui-label text-ink min-block-ui-target',
  PLAY_PIECE_CLASSES,
  FOCUS_CLASSES,
);

interface GateBaseProps {
  open: boolean;
  /** Called once an adult has passed the check. Close the gate by setting `open` to false. */
  onPass: () => void;
  /** Called when the gate is dismissed without passing. */
  onCancel: () => void;
}

export type ParentalGateProps = GateBaseProps &
  (
    | { mode: Extract<GateMode, 'challenge'>; random?: () => number }
    | { mode: Extract<GateMode, 'pin'>; verifyPin: (pin: string) => boolean }
  );

/**
 * Stands before settings, purchases, external links and leaving child mode (CLAUDE.md rule 6).
 * Take the mode from the band's configuration (`gateModeForBand`), never from the child's age.
 * Answers go in through an on-screen number pad, so there is no free-text input.
 */
export function ParentalGate(props: ParentalGateProps) {
  const { t } = useI18n();

  return (
    <Dialog open={props.open} title={t('ui.gate.title')} onClose={props.onCancel}>
      {/* Mounted only while open, so every opening starts fresh. */}
      {props.open &&
        (props.mode === 'challenge' ? (
          <ChallengeGate random={props.random ?? Math.random} onPass={props.onPass} />
        ) : (
          <PinGate verifyPin={props.verifyPin} onPass={props.onPass} />
        ))}
    </Dialog>
  );
}

function ChallengeGate({ random, onPass }: { random: () => number; onPass: () => void }) {
  const { t, format } = useI18n();
  const [question, setQuestion] = useState(() => makeGateQuestion(random));
  const [entry, setEntry] = useState('');
  const [wrong, setWrong] = useState(false);
  const questionId = useId();

  const submit = () => {
    if (isGateAnswer(question, entry)) {
      onPass();
      return;
    }
    setWrong(true);
    setEntry('');
    setQuestion(makeGateQuestion(random));
  };

  return (
    <div className={GATE_CLASSES}>
      <p>{t('ui.gate.intro')}</p>
      <p id={questionId} className={PROMPT_CLASSES}>
        {t('ui.gate.question', {
          a: t(NUMBER_WORDS[question.a]),
          b: t(NUMBER_WORDS[question.b]),
        })}
      </p>
      <output className={ENTRY_CLASSES} aria-labelledby={questionId}>
        {entry === '' ? null : format.number(Number(entry))}
      </output>
      {wrong && (
        <p role="alert" className={MESSAGE_CLASSES}>
          {t('ui.gate.wrong')}
        </p>
      )}
      <Keypad
        onDigit={(digit) => {
          setEntry((current) =>
            current.length < ANSWER_DIGITS ? `${current}${String(digit)}` : current,
          );
        }}
        onDelete={() => {
          setEntry((current) => current.slice(0, -1));
        }}
        onSubmit={submit}
        canSubmit={entry !== ''}
      />
    </div>
  );
}

function PinGate({
  verifyPin,
  onPass,
}: {
  verifyPin: (pin: string) => boolean;
  onPass: () => void;
}) {
  const { t } = useI18n();
  const [entry, setEntry] = useState('');
  const [wrong, setWrong] = useState(false);

  const submit = () => {
    if (verifyPin(entry)) {
      onPass();
      return;
    }
    setWrong(true);
    setEntry('');
  };

  return (
    <div className={GATE_CLASSES}>
      <p className={PROMPT_CLASSES}>{t('ui.gate.pinPrompt')}</p>
      <output
        className={cn(ENTRY_CLASSES, 'lf-gate__entry--pin')}
        aria-label={t('ui.gate.pinEntered', { count: entry.length })}
      >
        {Array.from({ length: PIN_DIGITS }, (_, index) => (
          <span
            key={index}
            className={cn(
              'lf-gate__dot rounded-full border-2 border-ink block-4 inline-4',
              index < entry.length && 'lf-gate__dot--filled bg-ink',
            )}
          />
        ))}
      </output>
      {wrong && (
        <p role="alert" className={MESSAGE_CLASSES}>
          {t('ui.gate.pinWrong')}
        </p>
      )}
      <Keypad
        onDigit={(digit) => {
          setEntry((current) =>
            current.length < PIN_DIGITS ? `${current}${String(digit)}` : current,
          );
        }}
        onDelete={() => {
          setEntry((current) => current.slice(0, -1));
        }}
        onSubmit={submit}
        canSubmit={entry.length === PIN_DIGITS}
      />
    </div>
  );
}

interface KeypadProps {
  onDigit: (digit: number) => void;
  onDelete: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
}

/** A phone-style number pad. It keeps 1–2–3 reading left to right in every direction. */
function Keypad({ onDigit, onDelete, onSubmit, canSubmit }: KeypadProps) {
  const { t, format } = useI18n();
  const digitKey = (digit: number) => (
    <button
      key={digit}
      type="button"
      className={KEY_CLASSES}
      onClick={() => {
        onDigit(digit);
      }}
    >
      {format.number(digit)}
    </button>
  );

  return (
    <div
      className="lf-keypad grid grid-cols-3 gap-ui-gap"
      role="group"
      aria-label={t('ui.gate.keypad')}
      dir="ltr"
    >
      {KEYPAD_DIGITS.map(digitKey)}
      <button
        type="button"
        className={KEY_CLASSES}
        aria-label={t('ui.gate.delete')}
        onClick={onDelete}
      >
        <DeleteIcon />
      </button>
      {digitKey(0)}
      <button
        type="button"
        className={cn(
          KEY_CLASSES,
          'lf-keypad__key--submit border-transparent bg-ui-primary text-ui-on-primary',
          DISABLED_CLASSES,
        )}
        disabled={!canSubmit}
        onClick={onSubmit}
      >
        {t('ui.gate.submit')}
      </button>
    </div>
  );
}
