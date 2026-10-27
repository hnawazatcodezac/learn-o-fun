import {
  ACTIVITY_CARD_KINDS,
  ActivityCard,
  AnswerTile,
  AvatarPicker,
  Button,
  Card,
  Celebration,
  Dialog,
  FEEDBACK_KINDS,
  Feedback,
  HintIcon,
  ParentalGate,
  PicturePinPad,
  ProgressTrail,
  SettingsPanel,
  SkillStatus,
  ToastProvider,
  gateModeForBand,
  useI18n,
  useToast,
  type AnswerTileState,
  type AvatarId,
  type PlaySettings,
} from '@learnofun/ui-kit';
import { SKILL_STATUSES, type PinPicture } from '@learnofun/contracts';
import { useState, type ComponentType } from 'react';
import type { ComponentId } from './matrix';
import { usePreview } from './PreviewContext';
import { createSeededRandom } from './seeded-random';

/** The examples' layouts: a row that wraps, a grid of cards, and a column. */
const ROW_CLASSES = 'flex flex-wrap items-center gap-4';

const TOP_ROW_CLASSES = 'flex flex-wrap items-start gap-4';

const GRID_CLASSES =
  'grid max-inline-ui-preview grid-cols-[repeat(auto-fill,minmax(var(--ui-preview-cell),1fr))] gap-5';

const STACK_CLASSES = 'flex flex-col gap-5';

/** The parent PIN the PIN gate accepts in the preview. */
const SAMPLE_PIN = '2468';

function ButtonPreview() {
  const { t } = useI18n();
  const primary = t('dev.preview.samples.primaryAction');
  const secondary = t('dev.preview.samples.secondaryAction');

  return (
    <div className={ROW_CLASSES}>
      <Button>{primary}</Button>
      <Button variant="secondary">{secondary}</Button>
      <Button variant="secondary" icon={<HintIcon />}>
        {t('dev.preview.samples.iconAction')}
      </Button>
      <Button disabled>{primary}</Button>
      <Button variant="secondary" disabled>
        {secondary}
      </Button>
    </div>
  );
}

/**
 * Every state, with a wordless one between Correct and Try again, so their words never meet. In a
 * game only the chosen tile has words.
 */
const ANSWER_TILE_ORDER: readonly AnswerTileState[] = [
  'default',
  'correct',
  'selected',
  'tryAgain',
  'ruledOut',
];

function AnswerTilePreview() {
  const { t, format } = useI18n();

  return (
    <div className={TOP_ROW_CLASSES} role="group">
      {ANSWER_TILE_ORDER.map((state, index) => (
        <AnswerTile key={state} state={state}>
          {format.number(11 + index)}
        </AnswerTile>
      ))}
      <AnswerTile content="word">{t('dev.preview.samples.answerWord')}</AnswerTile>
    </div>
  );
}

function CardPreview() {
  const { t } = useI18n();

  return (
    <div className={GRID_CLASSES}>
      <Card title={t('dev.preview.samples.cardTitle')}>
        <p>{t('dev.preview.samples.cardBody')}</p>
        <Button>{t('dev.preview.samples.primaryAction')}</Button>
      </Card>
      <Card title={t('dev.preview.samples.cardTitleShort')} />
    </div>
  );
}

/** The spec's three Today cards, then a library card with no kind. */
const ACTIVITY_SAMPLES = {
  review: ['activityReview', 4],
  new: ['activityNew', 6],
  choice: ['activityChoice', 5],
} as const;

function ActivityCardPreview() {
  const { t } = useI18n();

  return (
    <div className={GRID_CLASSES}>
      {ACTIVITY_CARD_KINDS.map((kind) => {
        const [title, minutes] = ACTIVITY_SAMPLES[kind];
        return (
          <ActivityCard
            key={kind}
            kind={kind}
            title={t(`dev.preview.samples.${title}`)}
            minutes={minutes}
          />
        );
      })}
      <ActivityCard title={t('dev.preview.samples.activityChoice')} minutes={1} />
    </div>
  );
}

function AvatarPickerPreview() {
  const { t } = useI18n();
  const [avatar, setAvatar] = useState<AvatarId>('blue-square');

  return (
    <AvatarPicker
      label={t('dev.preview.samples.avatarLabel')}
      value={avatar}
      onChange={setAvatar}
    />
  );
}

function ProgressTrailPreview() {
  return (
    <div className={STACK_CLASSES}>
      <ProgressTrail done={0} total={5} />
      <ProgressTrail done={5} total={8} />
      <ProgressTrail done={6} total={6} />
    </div>
  );
}

function DialogPreview() {
  const { t } = useI18n();
  // Open from the start, so the accessibility and screenshot tests see the dialog itself.
  const [open, setOpen] = useState(true);
  const close = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        {t('dev.preview.samples.openDialog')}
      </Button>
      <Dialog open={open} title={t('dev.preview.samples.dialogTitle')} onClose={close}>
        <p>{t('dev.preview.samples.dialogBody')}</p>
        <div className={ROW_CLASSES}>
          <Button onClick={close}>{t('dev.preview.samples.takeBreak')}</Button>
          <Button variant="secondary" onClick={close}>
            {t('dev.preview.samples.keepGoing')}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function ShowToastButton() {
  const { t } = useI18n();
  const { show } = useToast();

  return (
    <Button
      onClick={() => {
        show(t('dev.preview.samples.toastSaved'));
      }}
    >
      {t('dev.preview.samples.showToast')}
    </Button>
  );
}

function ToastPreview() {
  const { t } = useI18n();

  return (
    <ToastProvider
      initialMessages={[t('dev.preview.samples.toastSaved'), t('dev.preview.samples.toastGoal')]}
    >
      <ShowToastButton />
    </ToastProvider>
  );
}

/** The spec's sample lines: praise the strategy, give a next step, or give the first move. */
const FEEDBACK_SAMPLES = {
  correct: ['feedbackCorrect', 'feedbackCorrectDetail'],
  tryAgain: ['feedbackTryAgain', 'feedbackTryAgainDetail'],
  hint: ['feedbackHint', 'feedbackHintDetail'],
} as const;

function FeedbackPreview() {
  const { t } = useI18n();

  return (
    <div className={STACK_CLASSES}>
      {FEEDBACK_KINDS.map((kind) => (
        <Feedback key={kind} kind={kind} open inline />
      ))}
      {FEEDBACK_KINDS.map((kind) => {
        const [message, detail] = FEEDBACK_SAMPLES[kind];
        return (
          <Feedback
            key={`${kind}-sample`}
            kind={kind}
            open
            inline
            message={t(`dev.preview.samples.${message}`)}
            detail={t(`dev.preview.samples.${detail}`)}
          />
        );
      })}
    </div>
  );
}

function CelebrationPreview() {
  const { t } = useI18n();

  return (
    <Celebration open inline>
      <Button>{t('dev.preview.samples.continue')}</Button>
    </Celebration>
  );
}

function ParentalGatePreview() {
  const { t } = useI18n();
  const { params } = usePreview();
  // Open from the start, so the accessibility and screenshot tests see the gate itself.
  const [open, setOpen] = useState(true);
  const [outcome, setOutcome] = useState<'passed' | 'cancelled' | null>(null);
  // Seeded, so the question is the same on every run.
  const [random] = useState(() => createSeededRandom(1));
  // Child bands use their configured gate; the parent preview shows the PIN gate.
  const mode = params.band === 'parent' ? 'pin' : gateModeForBand(params.band);

  const gate = {
    open,
    onPass: () => {
      setOpen(false);
      setOutcome('passed');
    },
    onCancel: () => {
      setOpen(false);
      setOutcome('cancelled');
    },
  };

  return (
    <div className={STACK_CLASSES}>
      <div>
        <Button
          onClick={() => {
            setOutcome(null);
            setOpen(true);
          }}
        >
          {t('dev.preview.samples.openGate')}
        </Button>
      </div>
      {outcome && (
        <p role="status">
          {t(
            outcome === 'passed'
              ? 'dev.preview.samples.gatePassed'
              : 'dev.preview.samples.gateCancelled',
          )}
        </p>
      )}
      {mode === 'challenge' ? (
        <ParentalGate {...gate} mode="challenge" random={random} />
      ) : (
        <ParentalGate {...gate} mode="pin" verifyPin={(pin) => pin === SAMPLE_PIN} />
      )}
    </div>
  );
}

function SettingsPanelPreview() {
  const { params, update } = usePreview();
  // Sound settings stay local; the appearance settings drive the whole preview page.
  const [sound, setSound] = useState({ sound: true, music: false, voice: true, timers: true });
  const settings: PlaySettings = {
    ...sound,
    reducedMotion: params.reducedMotion,
    highContrast: params.theme === 'contrast',
    dyslexiaFont: params.font === 'dyslexia',
    textScale: params.textScale,
  };

  return (
    <SettingsPanel
      value={settings}
      onChange={(next) => {
        setSound({ sound: next.sound, music: next.music, voice: next.voice, timers: next.timers });
        const theme = next.highContrast
          ? 'contrast'
          : params.theme === 'contrast'
            ? 'system'
            : params.theme;
        update({
          theme,
          reducedMotion: next.reducedMotion,
          font: next.dyslexiaFont ? 'dyslexia' : 'default',
          textScale: next.textScale,
        });
      }}
    />
  );
}

function PicturePinPreview() {
  const { t } = useI18n();
  // Two pictures chosen from the start, so the screenshots show filled and empty slots.
  const [pin, setPin] = useState<PinPicture[]>(['sun', 'fish']);

  return (
    <div className={STACK_CLASSES}>
      <PicturePinPad value={pin} onChange={setPin} label={t('dev.preview.samples.pinLabel')} />
      {pin.length === 3 && <p role="status">{t('dev.preview.samples.pinComplete')}</p>}
    </div>
  );
}

/** Every status, then one with too little evidence yet. Parent dashboard only. */
function SkillStatusPreview() {
  return (
    <div className={STACK_CLASSES}>
      <div className={ROW_CLASSES}>
        {SKILL_STATUSES.map((status) => (
          <SkillStatus key={status} status={status} />
        ))}
      </div>
      <SkillStatus status="exploring" earlySignal />
    </div>
  );
}

export const PREVIEWS: Record<ComponentId, ComponentType> = {
  button: ButtonPreview,
  'answer-tile': AnswerTilePreview,
  card: CardPreview,
  'activity-card': ActivityCardPreview,
  'avatar-picker': AvatarPickerPreview,
  'progress-trail': ProgressTrailPreview,
  dialog: DialogPreview,
  toast: ToastPreview,
  feedback: FeedbackPreview,
  celebration: CelebrationPreview,
  'parental-gate': ParentalGatePreview,
  'settings-panel': SettingsPanelPreview,
  'picture-pin': PicturePinPreview,
  'skill-status': SkillStatusPreview,
};
