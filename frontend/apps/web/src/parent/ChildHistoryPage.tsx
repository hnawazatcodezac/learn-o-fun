import type {
  CatalogResponse,
  ChildSessionsResponse,
  FamilyResponse,
  ItemOutcome,
  SessionHistoryEntry,
  SessionStatus,
} from '@learnofun/contracts';
import { localizeContent } from '@learnofun/i18n';
import { useI18n } from '@learnofun/ui-kit';
import { useCallback, useEffect, useId } from 'react';
import { Link, useQueryParam } from '../shared/navigation';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { LoadState } from '../shared/LoadState';
import { weekOf } from './profile-form';
import { useFamily } from './use-family';
import {
  COLUMN_LIST_CLASSES,
  HEADING_CLASSES,
  HINT_CLASSES,
  SECTION_CLASSES,
  SESSION_CARD_CLASSES,
  STRAND_TITLE_CLASSES,
  TITLE_CLASSES,
} from './classes';

type Translate = ReturnType<typeof useI18n>['t'];

/** A session's status in calm words. Each key is written out, so the catalog checks it. */
function statusText(t: Translate, status: SessionStatus): string {
  switch (status) {
    case 'in-progress':
      return t('parent.history.status.in-progress');
    case 'completed':
      return t('parent.history.status.completed');
    case 'ended-early':
      return t('parent.history.status.ended-early');
    case 'interrupted':
      return t('parent.history.status.interrupted');
    case 'expired':
      return t('parent.history.status.expired');
  }
}

/** How a question went. Each key is written out, so the catalog checks it. */
function outcomeText(t: Translate, outcome: ItemOutcome): string {
  switch (outcome) {
    case 'first-try':
      return t('parent.history.outcomes.first-try');
    case 'later-try':
      return t('parent.history.outcomes.later-try');
    case 'with-hint':
      return t('parent.history.outcomes.with-hint');
    case 'shown-how':
      return t('parent.history.outcomes.shown-how');
    case 'not-yet':
      return t('parent.history.outcomes.not-yet');
    case 'skipped':
      return t('parent.history.outcomes.skipped');
    case 'unanswered':
      return t('parent.history.outcomes.unanswered');
  }
}

/**
 * /parent/child/sessions?id=<child>: the child's sessions by week, newest first, with plan
 * 5.2's measures as counts (ADR 0029). On premium each session shows every measure and opens to
 * its questions one by one; on the free plan, the headline. Never a game score.
 */
export function ChildHistoryPage() {
  const { t } = useI18n();
  const family = useFamily();
  const childId = useQueryParam('id');

  return (
    <LoadState result={family}>
      {(data) => {
        const child = data.children.find((candidate) => candidate.id === childId);
        if (!child) {
          return (
            <>
              <h1 className={TITLE_CLASSES}>{t('parent.profile.notFound')}</h1>
              <p>
                <Link to="/parent">{t('parent.profile.back')}</Link>
              </p>
            </>
          );
        }
        return <History family={data} childId={child.id} nickname={child.nickname} />;
      }}
    </LoadState>
  );
}

function History({
  family,
  childId,
  nickname,
}: {
  family: FamilyResponse;
  childId: string;
  nickname: string;
}) {
  const { t } = useI18n();
  const familyId = family.family.id;
  const load = useCallback(
    () => Promise.all([api.childSessions(familyId, childId), api.catalog()]),
    [familyId, childId],
  );
  const data = useApi(load);
  const title = t('parent.history.title', { nickname });

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <>
      <h1 className={TITLE_CLASSES}>{title}</h1>
      <LoadState result={data}>
        {([history, catalog]) => (
          <HistoryView history={history} catalog={catalog} timeZone={family.family.timeZone} />
        )}
      </LoadState>
    </>
  );
}

function HistoryView({
  history,
  catalog,
  timeZone,
}: {
  history: ChildSessionsResponse;
  catalog: CatalogResponse;
  timeZone: string;
}) {
  const { t, format } = useI18n();
  const weeks = new Map<string, SessionHistoryEntry[]>();
  for (const session of history.sessions) {
    const week = weekOf(session.startedAt, timeZone);
    weeks.set(week, [...(weeks.get(week) ?? []), session]);
  }

  return (
    <>
      {history.detail === 'basic' && (
        <p className={HINT_CLASSES}>
          {t('parent.history.premium')}{' '}
          <Link to="/parent/plan">{t('parent.children.seePlan')}</Link>
        </p>
      )}
      {history.sessions.length === 0 && <p>{t('parent.history.empty')}</p>}
      {[...weeks].map(([week, sessions]) => (
        <Week
          key={week}
          title={t('parent.history.week', {
            date: format.date(new Date(`${week}T12:00:00Z`), {
              day: 'numeric',
              month: 'long',
              timeZone: 'UTC',
            }),
          })}
          sessions={sessions}
          catalog={catalog}
          timeZone={timeZone}
        />
      ))}
    </>
  );
}

function Week({
  title,
  sessions,
  catalog,
  timeZone,
}: {
  title: string;
  sessions: readonly SessionHistoryEntry[];
  catalog: CatalogResponse;
  timeZone: string;
}) {
  const id = useId();
  return (
    <section className={SECTION_CLASSES} aria-labelledby={id}>
      <h2 className={HEADING_CLASSES} id={id}>
        {title}
      </h2>
      <ul className={COLUMN_LIST_CLASSES}>
        {sessions.map((session) => (
          <Session key={session.id} session={session} catalog={catalog} timeZone={timeZone} />
        ))}
      </ul>
    </section>
  );
}

function Session({
  session,
  catalog,
  timeZone,
}: {
  session: SessionHistoryEntry;
  catalog: CatalogResponse;
  timeZone: string;
}) {
  const { t, locale, format } = useI18n();
  const activity = catalog.activities.find((candidate) => candidate.id === session.activityId);
  const skillTitle = (skillId: string | undefined) => {
    const found = catalog.skillGraph.skills.find((skill) => skill.id === skillId);
    return found ? localizeContent(found.title, locale) : '';
  };
  const { detail, attempted } = session;

  return (
    <li className={SESSION_CARD_CLASSES}>
      <h3 className={STRAND_TITLE_CLASSES}>
        {activity ? localizeContent(activity.title, locale) : session.activityId}
      </h3>
      <p className={HINT_CLASSES}>
        {format.date(new Date(session.startedAt), {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: 'numeric',
          minute: '2-digit',
          timeZone,
        })}
      </p>
      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
        <li>{statusText(t, session.status)}</li>
        <li>{t('parent.history.time', { minutes: Math.round(session.timeOnTaskSeconds / 60) })}</li>
        <li>
          {attempted === 0
            ? t('parent.history.noAnswers')
            : t('parent.history.firstTries', { correct: session.firstTryCorrect, attempted })}
        </li>
        {detail && attempted > 0 && (
          <li>
            {t('parent.history.eventually', { correct: detail.eventuallyCorrect, attempted })}
          </li>
        )}
        {detail && detail.supported > 0 && (
          <li>{t('parent.history.supported', { count: detail.supported })}</li>
        )}
        {detail && detail.learningCredit > 0 && (
          <li>{t('parent.history.credit', { count: detail.learningCredit })}</li>
        )}
        {detail && detail.skipped > 0 && (
          <li>{t('parent.history.skipped', { count: detail.skipped })}</li>
        )}
        {detail && detail.unanswered > 0 && (
          <li>{t('parent.history.unanswered', { count: detail.unanswered })}</li>
        )}
      </ul>
      {detail && detail.items.length > 0 && (
        <details>
          <summary className="cursor-pointer font-label text-action min-block-target-family">
            {t('parent.history.questions')}
          </summary>
          <ol className="m-0 flex list-none flex-col gap-1 p-0">
            {detail.items.map((item, index) => (
              <li key={item.itemId}>
                <span>
                  {t('parent.history.question', {
                    number: index + 1,
                    skill: skillTitle(item.skillIds[0]),
                  })}
                </span>{' '}
                <span className="text-ink-muted">{outcomeText(t, item.outcome)}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </li>
  );
}
