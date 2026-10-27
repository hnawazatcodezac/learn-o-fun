import {
  TODAY_CARDS,
  type Activity,
  type ChildSnapshot,
  type TodayCard,
} from '@learnofun/contracts';
import { GAME_IDS } from '@learnofun/game-registry';
import { localizeContent } from '@learnofun/i18n';
import {
  AVATARS,
  ActivityCard,
  Avatar,
  Button,
  isAvatarId,
  useI18n,
  type ActivityCardKind,
} from '@learnofun/ui-kit';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from '../shared/navigation';
import { useApi } from '../api/useApi';
import { LoadState } from '../shared/LoadState';
import { useChildMode } from './child-mode';
import { ChildGate } from './ChildGate';
import { ChildScreen } from './ChildScreen';
import { DEFAULT_BAND } from './config';
import { GrownUpSettings } from './GrownUpSettings';
import { playability, playableActivities, type PlayOptions } from './play/activity';
import { hasTimeToday } from './play/play-time';
import { RequireChild } from './RequireChild';
import { childApi } from './sync';
import { TimeUp } from './TimeUp';

/** Activity cards at the spec's 232px (its bundle.css; ADR 0019), centred, as many to a row as fit. */
const CARDS_CLASSES =
  'm-0 grid inline-full max-inline-ui-cards list-none grid-cols-[repeat(auto-fit,minmax(0,var(--ui-activity-card-width)))] justify-center gap-5 p-0';

/** The design system's name for each kind of Today card. */
const CARD_KIND: Record<TodayCard, ActivityCardKind> = {
  review: 'review',
  new: 'new',
  'free-choice': 'choice',
};

const playOptions = (snapshot: ChildSnapshot): PlayOptions => ({
  band: DEFAULT_BAND,
  gameIds: GAME_IDS,
  activityTier: snapshot.activityTier,
});

/**
 * /today: the chosen child's Today cards (plan 4.3), only those they can play (ADR 0018), in the
 * order Review, New skill, Your choice.
 */
export function Today() {
  return <RequireChild>{(snapshot) => <TodayScreen snapshot={snapshot} />}</RequireChild>;
}

/** /library: every activity the chosen child can play here, and nothing locked. */
export function Library() {
  return <RequireChild>{(snapshot) => <LibraryScreen snapshot={snapshot} />}</RequireChild>;
}

function TodayScreen({ snapshot }: { snapshot: ChildSnapshot }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const childId = snapshot.child.id;
  const load = useCallback(
    () => Promise.all([childApi.today(childId), childApi.catalog()]),
    [childId],
  );
  const data = useApi(load);

  return (
    <ChildPage
      snapshot={snapshot}
      title={t('child.today.title')}
      greeting={t('child.today.greeting', { nickname: snapshot.child.nickname })}
      testId="today"
    >
      {!hasTimeToday(snapshot) && <TimeUp nickname={snapshot.child.nickname} />}
      {hasTimeToday(snapshot) && (
        <>
          <LoadState result={data}>
            {([today, catalog]) => {
              const cards = [...today.cards]
                .sort((a, b) => TODAY_CARDS.indexOf(a.card) - TODAY_CARDS.indexOf(b.card))
                .flatMap((card) => {
                  const playable = playability(catalog, card.activityId, playOptions(snapshot));
                  return playable.playable ? [{ card, activity: playable.activity }] : [];
                });
              if (cards.length === 0) return <p>{t('child.today.empty')}</p>;
              return (
                <ul className={CARDS_CLASSES}>
                  {cards.map(({ card, activity }) => (
                    <li key={card.id}>
                      <PlayCard
                        activity={activity}
                        kind={CARD_KIND[card.card]}
                        skillId={card.skillId}
                      />
                    </li>
                  ))}
                </ul>
              );
            }}
          </LoadState>
          <Button
            variant="secondary"
            onClick={() => {
              navigate('/library');
            }}
          >
            {t('child.today.library')}
          </Button>
        </>
      )}
    </ChildPage>
  );
}

function LibraryScreen({ snapshot }: { snapshot: ChildSnapshot }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const catalog = useApi(childApi.catalog);

  return (
    <ChildPage snapshot={snapshot} title={t('child.library.title')} testId="library">
      {!hasTimeToday(snapshot) && <TimeUp nickname={snapshot.child.nickname} />}
      {hasTimeToday(snapshot) && (
        <LoadState result={catalog}>
          {(data) => {
            const activities = playableActivities(data, playOptions(snapshot));
            if (activities.length === 0) return <p>{t('child.library.empty')}</p>;
            return (
              <ul className={CARDS_CLASSES}>
                {activities.map((activity) => (
                  <li key={activity.id}>
                    <PlayCard activity={activity} />
                  </li>
                ))}
              </ul>
            );
          }}
        </LoadState>
      )}
      <Button
        variant="secondary"
        onClick={() => {
          navigate('/today');
        }}
      >
        {t('child.library.back')}
      </Button>
    </ChildPage>
  );
}

/** One activity to play, as one card: why it is here if Today says, its title and length. */
/** An activity to play; from Today, with the skill its card is for (ADR 0036). */
function PlayCard({
  activity,
  kind,
  skillId,
}: {
  activity: Activity;
  kind?: ActivityCardKind;
  skillId?: string;
}) {
  const { locale } = useI18n();
  const navigate = useNavigate();

  return (
    <ActivityCard
      kind={kind}
      title={localizeContent(activity.title, locale)}
      minutes={activity.minutes}
      onClick={() => {
        // The activity, and the skill Today's card named, travel in the query string (ADR 0042).
        const query = new URLSearchParams({
          activity: activity.id,
          ...(skillId ? { skill: skillId } : {}),
        });
        navigate(`/play?${query.toString()}`);
      }}
    />
  );
}

/**
 * A page in child mode: the child's avatar, the way to switch player, the grown-ups' settings
 * behind the parental gate, and the page's heading: the greeting in play-hero on Today, the one
 * place the design system gives it, or the page's title.
 */
function ChildPage({
  snapshot,
  title,
  greeting,
  testId,
  children,
}: {
  snapshot: ChildSnapshot;
  title: string;
  greeting?: string;
  testId: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { leave, refreshPlayToday } = useChildMode();
  // Today's play may have changed since the snapshot: a session just now, or more time allowed.
  useEffect(refreshPlayToday, [refreshPlayToday]);
  const [grownUps, setGrownUps] = useState<'closed' | 'gate' | 'settings'>('closed');
  const { nickname, avatarId } = snapshot.child;

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <ChildScreen band={DEFAULT_BAND}>
      {/* A page in child mode: a bar with the child, then the page's own content. */}
      <div className="flex flex-col min-block-dvh" data-testid={testId}>
        <header className="flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="block-ui-target inline-ui-target">
            <Avatar id={isAvatarId(avatarId) ? avatarId : AVATARS[0]} />
          </span>
          <div className="ms-auto flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                leave();
                navigate('/');
              }}
            >
              {t('child.today.switchPlayer')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setGrownUps('gate');
              }}
            >
              {t('child.today.grownUps')}
            </Button>
          </div>
        </header>
        <main className="flex flex-col items-center gap-5 p-4">
          {greeting === undefined ? (
            <h1 className="m-0 font-display text-play-title">{title}</h1>
          ) : (
            // play-hero: one per screen, for the Today greeting (design system type).
            <h1 className="m-0 font-display text-play-hero">{greeting}</h1>
          )}
          {children}
        </main>
      </div>
      <ChildGate
        band={DEFAULT_BAND}
        open={grownUps === 'gate'}
        onPass={() => {
          setGrownUps('settings');
        }}
        onCancel={() => {
          setGrownUps('closed');
        }}
      />
      <GrownUpSettings
        open={grownUps === 'settings'}
        nickname={nickname}
        onClose={() => {
          setGrownUps('closed');
        }}
      />
    </ChildScreen>
  );
}
