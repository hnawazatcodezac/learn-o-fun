import type { ChildSnapshot } from '@learnofun/contracts';
import { GAME_IDS, loadGame } from '@learnofun/game-registry';
import type { GamePackage } from '@learnofun/game-sdk';
import { SESSION_PLANS, createAdaptivePolicy, templateMaker } from '@learnofun/learning-core';
import { Button, useI18n } from '@learnofun/ui-kit';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useQueryParam, useSearchParams } from '../../shared/navigation';
import { useApi } from '../../api/useApi';
import { LoadState } from '../../shared/LoadState';
import { NotFound } from '../../shared/NotFound';
import { useChildMode } from '../child-mode';
import { ChildScreen } from '../ChildScreen';
import { DEFAULT_BAND } from '../config';
import { RequireChild } from '../RequireChild';
import { childApi, outbox, savedSessions } from '../sync';
import {
  expire,
  isExpired,
  pauseReasonOf,
  readyToResume,
  type SavedSession,
} from '../sync/saved-sessions';
import { TimeUp } from '../TimeUp';
import { pickMode, playability, sessionTarget, type Playability } from './activity';
import { GameShell } from './GameShell';
import { hasTimeToday, playTimeOf, recordBreak } from './play-time';
import { PlayError, PlayErrorBoundary } from './PlayError';
import { useSavedSession } from './use-saved-session';

/** "Back to my games" goes to the child's Today. */
const EXIT_TO = '/today';

type Loaded =
  | { playable: false }
  | (Extract<Playability, { playable: true }> & {
      pkg: GamePackage;
      childId: string;
      /** A saved session of this activity to carry on, made ready (ADR 0023). */
      resume?: SavedSession;
    });

/**
 * The saved session of this activity, if it can carry on (ADR 0023). One not seen for 24 hours
 * is closed as expired instead, and forgotten.
 */
async function savedSessionFor(
  childId: string,
  activityId: string,
): Promise<SavedSession | undefined> {
  const saved = await savedSessions.load(childId, activityId).catch(() => undefined);
  if (!saved) return undefined;
  if (isExpired(saved, Date.now())) {
    outbox.queueEvents(expire(saved, Date.now()));
    await savedSessions.remove(childId, activityId);
    return undefined;
  }
  const ready = readyToResume(saved);
  outbox.queueEvents(ready.events);
  return ready.saved;
}

async function loadActivity(
  activityId: string,
  childId: string,
  activityTier: ChildSnapshot['activityTier'],
): Promise<Loaded> {
  const catalog = await childApi.catalog();
  const resolved = playability(catalog, activityId, {
    band: DEFAULT_BAND,
    gameIds: GAME_IDS,
    activityTier,
  });
  if (!resolved.playable) return { playable: false };
  const pkg = await loadGame(resolved.activity.gameId);
  if (!pkg) return { playable: false };
  const resume = await savedSessionFor(childId, activityId);
  return resume ? { ...resolved, pkg, childId, resume } : { ...resolved, pkg, childId };
}

/** A new session starts with no items: the policy has them made as it goes (ADR 0032). */
const NO_ITEMS = [] as const;

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

/**
 * /play/:activityId: one session of an activity from the catalog, in the game shell, played by
 * the chosen child, with its session and events sent to the API as they happen.
 * `?mode=challenge` plays Challenge, if the activity offers it.
 */
export function ActivityPlay() {
  return <RequireChild>{(snapshot) => <ActivityLoader snapshot={snapshot} />}</RequireChild>;
}

function ActivityLoader({ snapshot }: { snapshot: ChildSnapshot }) {
  const { refreshPlayToday } = useChildMode();
  useEffect(refreshPlayToday, [refreshPlayToday]);
  // Decided as the route opens: a session that uses up the day ends with its own celebration.
  const [timeUp] = useState(() => !hasTimeToday(snapshot));
  if (timeUp) return <TimeUpScreen nickname={snapshot.child.nickname} />;
  return <ActivityFinder snapshot={snapshot} />;
}

/** No play left today (ADR 0022): the activity does not start, and the way back is to Today. */
function TimeUpScreen({ nickname }: { nickname: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <ChildScreen band={DEFAULT_BAND}>
      <main className="placeholder">
        <TimeUp nickname={nickname}>
          <Button
            onClick={() => {
              void navigate(EXIT_TO);
            }}
          >
            {t('child.timeUp.back')}
          </Button>
        </TimeUp>
      </main>
    </ChildScreen>
  );
}

function ActivityFinder({ snapshot }: { snapshot: ChildSnapshot }) {
  const activityId = useQueryParam('activity');
  const childId = snapshot.child.id;
  const { activityTier } = snapshot;
  const load = useCallback(
    () => loadActivity(activityId, childId, activityTier),
    [activityId, childId, activityTier],
  );
  const result = useApi(load);

  if (result.status === 'ready' && !result.data.playable) {
    return (
      <ChildScreen band={DEFAULT_BAND}>
        <NotFound homePath={EXIT_TO} />
      </ChildScreen>
    );
  }
  if (result.status !== 'ready' || !result.data.playable) {
    return (
      <ChildScreen band={DEFAULT_BAND}>
        <main className="placeholder">
          <LoadState result={result}>{() => null}</LoadState>
        </main>
      </ChildScreen>
    );
  }
  return <ActivitySession loaded={result.data} snapshot={snapshot} />;
}

function ActivitySession({
  loaded,
  snapshot,
}: {
  loaded: Extract<Loaded, { playable: true }>;
  snapshot: ChildSnapshot;
}) {
  const { activity, template, childId, contentRelease, pkg, resume } = loaded;
  const [search] = useSearchParams();
  // A saved session carries on as it was: its mode, seed, plan and items (ADR 0023).
  const mode = resume?.mode ?? pickMode(activity, search.get('mode'));
  const [seed] = useState(() => resume?.seed ?? randomSeed());
  const [refused, setRefused] = useState(false);
  // The band shapes the session: a warm-up, the core block and easy items to end on (ADR 0022).
  const plan = resume?.plan ?? SESSION_PLANS[DEFAULT_BAND];
  // Plan 4.2's policy chooses each item, made on demand from the template, starting from the
  // child's ability on the skill Today's card named (ADR 0032, ADR 0036).
  const policy = useMemo(() => createAdaptivePolicy({ band: DEFAULT_BAND }), []);
  const maker = useMemo(() => templateMaker(template), [template]);
  const items = resume?.state.items ?? NO_ITEMS;
  const [{ learner }] = useState(() =>
    sessionTarget(activity, snapshot.skillStates, search.get('skill')),
  );
  const restore = useMemo(() => {
    if (!resume) return undefined;
    const resumeFor = pauseReasonOf(resume.events);
    return { state: resume.state, events: resume.events, ...(resumeFor ? { resumeFor } : {}) };
  }, [resume]);
  const onRefused = useCallback(() => {
    setRefused(true);
  }, []);
  const { emit, onState, finish } = useSavedSession({
    childId,
    activityId: activity.id,
    mode,
    seed,
    plan,
    resume,
    onRefused,
  });
  const setup = useMemo(
    () => ({ childId, activityId: activity.id, contentRelease }),
    [childId, activity.id, contentRelease],
  );
  // The time limits as the session starts (ADR 0022), and where a break leaves the count.
  const [time] = useState(() => playTimeOf(snapshot));
  const [today] = useState(() => snapshot.playToday);
  const onBreak = useCallback(
    (sessionMs: number) => {
      recordBreak(childId, today.date, today.playedSeconds * 1000 + sessionMs);
    },
    [childId, today],
  );
  // Counted here at once, ahead of the API, which hears of the session's last events later.
  const { setPlayToday } = useChildMode();
  const onEnd = useCallback(
    (sessionMs: number) => {
      setPlayToday({ ...today, playedSeconds: today.playedSeconds + Math.round(sessionMs / 1000) });
      finish();
    },
    [setPlayToday, today, finish],
  );

  return (
    <ChildScreen band={DEFAULT_BAND}>
      {refused ? (
        <PlayError exitTo={EXIT_TO} />
      ) : (
        <PlayErrorBoundary exitTo={EXIT_TO}>
          <GameShell
            game={pkg.game}
            items={items}
            mode={mode}
            band={DEFAULT_BAND}
            setup={setup}
            seed={seed}
            emit={emit}
            plan={plan}
            policy={policy}
            maker={maker}
            {...(learner ? { learner } : {})}
            time={time}
            onBreak={onBreak}
            onEnd={onEnd}
            {...(restore ? { restore } : {})}
            onState={onState}
            exitTo={EXIT_TO}
          />
        </PlayErrorBoundary>
      )}
    </ChildScreen>
  );
}
