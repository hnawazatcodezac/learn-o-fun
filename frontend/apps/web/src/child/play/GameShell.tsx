import type {
  ExperienceBand,
  Item,
  LearningEvent,
  LocalizedText,
  Mode,
  PauseReason,
} from '@learnofun/contracts';
import type { EventSink, GameModule, GameSettings } from '@learnofun/game-sdk';
import {
  plannedItems,
  type Ability,
  type ItemMaker,
  type SessionPlan,
  type SessionPolicy,
  type SessionState,
} from '@learnofun/learning-core';
import { localizeContent } from '@learnofun/i18n';
import {
  Button,
  Celebration,
  Dialog,
  Feedback,
  HintIcon,
  PauseIcon,
  ProgressTrail,
  SettingsPanel,
  useI18n,
} from '@learnofun/ui-kit';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useNavigate } from '../../shared/navigation';
import { useChildSettings } from '../child-mode';
import { ChildGate } from '../ChildGate';
import type { PlayTime } from './play-time';
import { PlayError } from './PlayError';
import {
  createShellStore,
  finishedWell,
  progressOf,
  startShellSession,
  type ShellSession,
  type ShellSessionOptions,
} from './session';

/** A dialog's content in the shell: a column, a line apart. */
const MENU_CLASSES = 'flex flex-col gap-3 [&_p]:m-0';

export interface GameShellProps {
  game: GameModule;
  items: readonly Item[];
  mode: Mode;
  band: ExperienceBand;
  setup: ShellSessionOptions['setup'];
  seed: number;
  emit: EventSink;
  /** How the items are laid out (ADR 0022). Without one, they are the core block alone. */
  plan?: SessionPlan;
  /**
   * The in-session policy, the maker of items on demand and the child's starting ability (ADR
   * 0036). Without them, the placeholder plays `items` in order, as a game's stories do.
   */
  policy?: SessionPolicy;
  maker?: ItemMaker;
  learner?: Ability;
  /** The time limits to keep to (ADR 0022). Without them, none apply. */
  time?: PlayTime;
  /** The child took a break, when the session had had `sessionMs` of active play. */
  onBreak?: (sessionMs: number) => void;
  /** The session completed or ended, after `sessionMs` of active play on this visit. */
  onEnd?: (sessionMs: number) => void;
  /** A saved session to carry on (ADR 0023); it comes back with the pause menu open. */
  restore?: { state: SessionState; events: readonly LearningEvent[]; resumeFor?: PauseReason };
  /** Called with the session's state whenever it changes, so it can be saved. */
  onState?: (state: SessionState) => void;
  /** Where "back to my games" goes. */
  exitTo: string;
}

/** The pause menu, the parental gate in front of settings, and the settings themselves. */
type Menu = 'closed' | 'menu' | 'gate' | 'settings';

/**
 * The game shell (plan 6.1): the game in the middle, with the pause button, progress trail and
 * hint button around it, the shared feedback after each answer and a celebration at the end. The
 * pause menu leads back to the child's games without a gate (ADR 0012) and to settings through
 * the parental gate (CLAUDE.md rule 6). It plays one session; give it a new `key` for another.
 */
export function GameShell({
  game,
  items,
  mode,
  band,
  setup,
  seed,
  emit,
  plan,
  policy,
  maker,
  learner,
  time,
  onBreak,
  onEnd,
  restore,
  onState,
  exitTo,
}: GameShellProps) {
  const { t, translate, locale, format } = useI18n();
  const navigate = useNavigate();
  const { settings, setSettings } = useChildSettings();
  const [store] = useState(createShellStore);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [menu, setMenu] = useState<Menu>('closed');
  const stageRef = useRef<HTMLElement>(null);
  const sessionRef = useRef<ShellSession>(undefined);

  // The game reads content text, numbers and settings when it uses them, so they follow later
  // changes.
  const localeRef = useRef(locale);
  const formatRef = useRef(format);
  const { reducedMotion, sound, textScale } = settings;
  const settingsRef = useRef<GameSettings>({ reducedMotion, sound, textScale });
  useEffect(() => {
    localeRef.current = locale;
    formatRef.current = format;
  }, [locale, format]);
  useEffect(() => {
    settingsRef.current = { reducedMotion, sound, textScale };
    sessionRef.current?.updateSettings(settingsRef.current);
  }, [reducedMotion, sound, textScale]);
  const localize = useCallback(
    (text: LocalizedText) => localizeContent(text, localeRef.current),
    [],
  );
  const formatNumber = useCallback((value: number) => formatRef.current.number(value), []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // React's development-only second mount keeps the session that is already running.
    let session = sessionRef.current;
    if (session) {
      session.stay();
    } else {
      session = startShellSession({
        game,
        root: stage,
        items,
        mode,
        setup,
        seed,
        emit,
        t: translate,
        localize,
        formatNumber,
        settings: settingsRef.current,
        store,
        ...(plan ? { plan } : {}),
        ...(policy ? { policy } : {}),
        ...(maker ? { maker } : {}),
        ...(learner ? { learner } : {}),
        ...(time ? { time } : {}),
        ...(onBreak ? { onBreak } : {}),
        ...(onEnd ? { onEnd } : {}),
        ...(restore ? { restore } : {}),
        ...(onState ? { onState } : {}),
        // A restored session comes back with the pause menu open, like coming back from the
        // background (ADR 0023), once its item is on screen, so closing the menu returns keyboard
        // focus to the game.
        onRestored: () => {
          sessionRef.current?.resumeRestored();
          setMenu((open) => (open === 'closed' ? 'menu' : open));
          sessionRef.current?.hold();
        },
      });
      sessionRef.current = session;
    }
    const current = session;
    return () => {
      current.leaveSoon();
    };
  }, [
    game,
    items,
    mode,
    setup,
    seed,
    emit,
    plan,
    policy,
    maker,
    learner,
    time,
    onBreak,
    onEnd,
    restore,
    onState,
    translate,
    localize,
    formatNumber,
    store,
  ]);

  const openMenu = useCallback(() => {
    setMenu((open) => (open === 'closed' ? 'menu' : open));
    sessionRef.current?.hold();
  }, []);
  const keepPlaying = () => {
    setMenu('closed');
    sessionRef.current?.release();
  };
  const openSettings = () => {
    setMenu('gate');
    sessionRef.current?.pause('parent-gate');
  };
  const backToMenu = () => {
    setMenu('menu');
    sessionRef.current?.resume('parent-gate');
  };
  const leave = () => {
    sessionRef.current?.exit();
    navigate(exitTo);
  };
  const hint = () => {
    sessionRef.current?.hint();
    // The hint button turns off now, so keyboard focus moves to the game.
    stageRef.current?.focus();
  };

  // Going to the background pauses the session (plan 5.4); coming back shows the pause menu, so
  // the child picks up again when ready.
  useEffect(() => {
    let backgrounded = false;
    const onVisibilityChange = () => {
      const session = sessionRef.current;
      if (!session) return;
      if (document.visibilityState === 'hidden') {
        if (store.getSnapshot().status !== 'playing') return;
        session.pause('backgrounded');
        backgrounded = true;
      } else if (backgrounded) {
        backgrounded = false;
        session.resume('backgrounded');
        openMenu();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [store, openMenu]);

  // While the shared feedback is up, a tap anywhere takes it down (the Feedback spec).
  const feedbackShown = snapshot.feedback !== undefined;
  useEffect(() => {
    if (!feedbackShown) return;
    const dismiss = () => {
      sessionRef.current?.dismissFeedback();
    };
    document.addEventListener('pointerdown', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
    };
  }, [feedbackShown]);

  const { done, total } = progressOf(snapshot, plan ? plannedItems(plan) : items.length);
  const playing = snapshot.status === 'playing';
  const failed = snapshot.status === 'failed';
  const completed = finishedWell(snapshot);

  return (
    // The game shell: a bar with pause, progress and hint above the game, which fills the rest. On
    // phones, Pause and Hint show only their icons, with the trail's count between them and the
    // trail itself on a row of its own, so the game keeps its room (ADR 0019). Their words stay as
    // the buttons' names for screen readers.
    <div className="flex flex-col min-block-dvh" data-testid="game-shell">
      <header className="flex flex-wrap items-center gap-3 px-4 py-3 max-phone:grid max-phone:grid-cols-[auto_1fr_auto] max-phone:play:[&_.lf-button]:px-0 max-phone:play:[&_.lf-button]:inline-ui-target max-phone:[&_.lf-button\_\_label]:sr-only max-phone:[&>.lf-button:first-child]:col-start-1 max-phone:[&>.lf-button:first-child]:row-start-1 max-phone:[&>.lf-button:last-child:not(:first-child)]:col-start-3 max-phone:[&>.lf-button:last-child:not(:first-child)]:row-start-1">
        <Button variant="secondary" icon={<PauseIcon />} disabled={!playing} onClick={openMenu}>
          {t('child.play.pause')}
        </Button>
        <div className="shrink grow basis-ui-progress-basis min-inline-0 max-phone:contents max-phone:[&_.lf-trail]:contents max-phone:[&_.lf-trail\_\_count]:col-start-2 max-phone:[&_.lf-trail\_\_count]:row-start-1 max-phone:[&_.lf-trail\_\_count]:justify-self-center max-phone:[&_.lf-trail\_\_steps]:col-span-full max-phone:[&_.lf-trail\_\_steps]:row-start-2 max-phone:[&_.lf-trail\_\_steps]:justify-self-center">
          <ProgressTrail done={done} total={total} />
        </div>
        {mode === 'practice' && (
          <Button
            variant="secondary"
            icon={<HintIcon />}
            disabled={!playing || !snapshot.canHint}
            onClick={hint}
          >
            {t('child.play.hint')}
          </Button>
        )}
      </header>
      <main
        ref={stageRef}
        className="grid flex-1 place-items-center px-4 focus:outline-none [&[hidden]]:hidden"
        data-testid="game-stage"
        aria-label={t('child.play.stage')}
        tabIndex={-1}
        hidden={failed}
      />
      {failed && <PlayError exitTo={exitTo} />}
      <Feedback kind={snapshot.feedback ?? 'correct'} open={feedbackShown && !completed} />
      <Celebration open={completed}>
        {/* The game has gone, so focus moves to the way out. */}
        <Button autoFocus onClick={leave}>
          {t('child.play.leave')}
        </Button>
      </Celebration>
      {/* The break reminder (ADR 0022): a reminder, not enforced; either choice counts as the break. */}
      <Dialog
        open={snapshot.breakTime}
        title={t('child.play.break.title')}
        onClose={() => sessionRef.current?.keepPlaying()}
      >
        <div className={MENU_CLASSES}>
          <p>
            {snapshot.breakOffered ? t('child.play.break.offeredBody') : t('child.play.break.body')}
          </p>
          <Button onClick={() => sessionRef.current?.keepPlaying()}>
            {t('child.play.break.keepPlaying')}
          </Button>
          <Button variant="secondary" onClick={leave}>
            {t('child.play.break.stop')}
          </Button>
        </div>
      </Dialog>
      <Dialog open={menu === 'menu'} title={t('child.play.menu.title')} onClose={keepPlaying}>
        <div className={MENU_CLASSES}>
          <Button onClick={keepPlaying}>{t('child.play.menu.continue')}</Button>
          <Button variant="secondary" onClick={openSettings}>
            {t('child.play.menu.settings')}
          </Button>
          <Button variant="secondary" onClick={leave}>
            {t('child.play.leave')}
          </Button>
        </div>
      </Dialog>
      <ChildGate
        band={band}
        open={menu === 'gate'}
        onPass={() => {
          setMenu('settings');
        }}
        onCancel={backToMenu}
      />
      <Dialog
        open={menu === 'settings'}
        title={t('child.play.settings.title')}
        onClose={backToMenu}
      >
        <div className={MENU_CLASSES}>
          <SettingsPanel value={settings} onChange={setSettings} />
          <Button onClick={backToMenu}>{t('child.play.settings.done')}</Button>
        </div>
      </Dialog>
    </div>
  );
}
