import { useId, useState } from 'react';
import type { GateMode } from '../../appearance/bands';
import { useI18n } from '../../i18n/useI18n';
import { Dialog } from '../Dialog/Dialog';
import { DeleteIcon } from '../icons';
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
    <div className="lf-gate">
      <p>{t('ui.gate.intro')}</p>
      <p id={questionId} className="lf-gate__prompt">
        {t('ui.gate.question', {
          a: t(NUMBER_WORDS[question.a]),
          b: t(NUMBER_WORDS[question.b]),
        })}
      </p>
      <output className="lf-gate__entry" aria-labelledby={questionId}>
        {entry === '' ? null : format.number(Number(entry))}
      </output>
      {wrong && (
        <p role="alert" className="lf-gate__message">
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
    <div className="lf-gate">
      <p className="lf-gate__prompt">{t('ui.gate.pinPrompt')}</p>
      <output
        className="lf-gate__entry lf-gate__entry--pin"
        aria-label={t('ui.gate.pinEntered', { count: entry.length })}
      >
        {Array.from({ length: PIN_DIGITS }, (_, index) => (
          <span
            key={index}
            className={`lf-gate__dot${index < entry.length ? ' lf-gate__dot--filled' : ''}`}
          />
        ))}
      </output>
      {wrong && (
        <p role="alert" className="lf-gate__message">
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
      className="lf-keypad__key"
      onClick={() => {
        onDigit(digit);
      }}
    >
      {format.number(digit)}
    </button>
  );

  return (
    <div className="lf-keypad" role="group" aria-label={t('ui.gate.keypad')} dir="ltr">
      {KEYPAD_DIGITS.map(digitKey)}
      <button
        type="button"
        className="lf-keypad__key"
        aria-label={t('ui.gate.delete')}
        onClick={onDelete}
      >
        <DeleteIcon />
      </button>
      {digitKey(0)}
      <button
        type="button"
        className="lf-keypad__key lf-keypad__key--submit"
        disabled={!canSubmit}
        onClick={onSubmit}
      >
        {t('ui.gate.submit')}
      </button>
    </div>
  );
}
