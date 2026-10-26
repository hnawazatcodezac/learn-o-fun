import type {
  CatalogResponse,
  ChildProgressResponse,
  FamilyResponse,
  LearningGoal,
  Recommendation,
  StrandProgress,
  TodayCard,
} from '@learnofun/contracts';
import { localizeContent } from '@learnofun/i18n';
import { DEFAULT_EVIDENCE_CONFIG } from '@learnofun/learning-core';
import { SkillStatus, useI18n } from '@learnofun/ui-kit';
import { useCallback, useEffect, useId } from 'react';
import { Link, useQueryParam } from '../shared/navigation';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { LoadState } from '../shared/LoadState';
import { subjectName } from './subject-name';
import { useFamily } from './use-family';

type Translate = ReturnType<typeof useI18n>['t'];
type Reason = Recommendation['reasons'][number];

/** Each Today card's name for parents. Each key is written out, so the catalog checks it. */
function cardName(t: Translate, card: TodayCard): string {
  switch (card) {
    case 'review':
      return t('parent.progress.today.cards.review');
    case 'new':
      return t('parent.progress.today.cards.new');
    case 'free-choice':
      return t('parent.progress.today.cards.free-choice');
  }
}

interface Explaining {
  t: Translate;
  nickname: string;
  skill: (skillId: string | undefined) => string;
  date: (timestamp: string) => string;
  goal: LearningGoal | undefined;
  subject: (subjectId: LearningGoal['subjectId']) => string;
}

/**
 * A reason in growth language, from its code and its evidence (plan 4.4, ADR 0028), with the
 * child's nickname and never a pronoun: Learnofun does not know a child's gender.
 */
function explain(reason: Reason, skillId: string, context: Explaining): string {
  const { t, nickname, skill } = context;
  const { evidence } = reason;
  const counts =
    evidence.firstTryCorrect !== undefined &&
    evidence.firstTryTotal !== undefined &&
    evidence.sessionCount !== undefined
      ? {
          correct: evidence.firstTryCorrect,
          total: evidence.firstTryTotal,
          sessions: evidence.sessionCount,
        }
      : undefined;
  switch (reason.code) {
    case 'FRONTIER_READY':
      // A skill with no prerequisite builds on nothing: it is a first step (ADR 0035).
      if (evidence.relatedSkillId === undefined) {
        return t('parent.progress.reasons.frontierStart', { nickname, skill: skill(skillId) });
      }
      return counts
        ? t('parent.progress.reasons.frontierReady', {
            nickname,
            skill: skill(skillId),
            related: skill(evidence.relatedSkillId),
            ...counts,
          })
        : t('parent.progress.reasons.frontierReadyPlain', {
            nickname,
            skill: skill(skillId),
            related: skill(evidence.relatedSkillId),
          });
    case 'REVIEW_DUE':
      return evidence.masteredAt
        ? t('parent.progress.reasons.reviewDue', {
            nickname,
            skill: skill(skillId),
            date: context.date(evidence.masteredAt),
          })
        : t('parent.progress.reasons.reviewDuePlain', { skill: skill(skillId) });
    case 'PREREQ_SUPPORT':
      return t('parent.progress.reasons.prereqSupport', {
        skill: skill(skillId),
        related: skill(evidence.relatedSkillId),
      });
    case 'PARENT_GOAL': {
      const { goal } = context;
      if (!goal || goal.id !== evidence.goalId) return t('parent.progress.reasons.parentGoalPlain');
      const focus = goal.skillId ? skill(goal.skillId) : context.subject(goal.subjectId);
      return t('parent.progress.reasons.parentGoal', { focus });
    }
    case 'KEEP_BUILDING':
      return counts
        ? t('parent.progress.reasons.keepBuilding', { nickname, skill: skill(skillId), ...counts })
        : t('parent.progress.reasons.keepBuildingPlain', { nickname, skill: skill(skillId) });
    case 'PLACEMENT_GAP':
      return t('parent.progress.reasons.placementGap', { skill: skill(skillId) });
    case 'FREE_CHOICE':
      return t('parent.progress.reasons.freeChoice', { nickname });
  }
}

/**
 * /parent/child/progress?id=<child>: why Today's activities were chosen, then the child's
 * skills by subject and strand (ADR 0028). On premium every skill shows with its evidence; on the
 * free plan, each strand is a summary.
 */
export function ChildProgressPage() {
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
              <h1 className="parent-page__title">{t('parent.profile.notFound')}</h1>
              <p>
                <Link to="/parent">{t('parent.profile.back')}</Link>
              </p>
            </>
          );
        }
        return <Progress family={data} childId={child.id} nickname={child.nickname} />;
      }}
    </LoadState>
  );
}

function Progress({
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
    () =>
      Promise.all([
        api.childProgress(familyId, childId),
        api.childLearning(familyId, childId),
        api.catalog(),
      ]),
    [familyId, childId],
  );
  const data = useApi(load);
  const title = t('parent.progress.title', { nickname });

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <>
      <h1 className="parent-page__title">{title}</h1>
      <LoadState result={data}>
        {([progress, learning, catalog]) => (
          <ProgressView
            progress={progress}
            goal={learning.goal}
            catalog={catalog}
            timeZone={family.family.timeZone}
            nickname={nickname}
          />
        )}
      </LoadState>
    </>
  );
}

function ProgressView({
  progress,
  goal,
  catalog,
  timeZone,
  nickname,
}: {
  progress: ChildProgressResponse;
  goal: LearningGoal | undefined;
  catalog: CatalogResponse;
  timeZone: string;
  nickname: string;
}) {
  const { t, locale, format } = useI18n();
  const todayId = useId();
  const { skillGraph } = catalog;
  const skill = (skillId: string | undefined) => {
    const found = skillGraph.skills.find((candidate) => candidate.id === skillId);
    return found ? localizeContent(found.title, locale) : '';
  };
  const context: Explaining = {
    t,
    nickname,
    skill,
    date: (timestamp) => format.date(new Date(timestamp), { dateStyle: 'long', timeZone }),
    goal,
    subject: (subjectId) => subjectName(t, subjectId),
  };

  return (
    <>
      <section className="parent-section" aria-labelledby={todayId}>
        <h2 className="parent-page__heading" id={todayId}>
          {t('parent.progress.today.title')}
        </h2>
        <ul className="parent-reasons">
          {progress.today.map((card) => {
            const activity = catalog.activities.find((a) => a.id === card.activityId);
            return (
              <li key={card.id} className="parent-reasons__card">
                <p className="parent-reasons__kind">{cardName(t, card.card)}</p>
                {activity && (
                  <p className="parent-reasons__activity">
                    {localizeContent(activity.title, locale)}
                  </p>
                )}
                {card.reasons.map((reason) => (
                  <p key={reason.code}>{explain(reason, card.skillId, context)}</p>
                ))}
              </li>
            );
          })}
        </ul>
      </section>

      {progress.detail === 'full' ? (
        <p className="parent-field__hint">
          {t('parent.progress.skills.earlyHint', {
            firstTries: DEFAULT_EVIDENCE_CONFIG.minFullWeight,
            items: DEFAULT_EVIDENCE_CONFIG.minItems,
          })}
        </p>
      ) : (
        <p className="parent-field__hint">
          {t('parent.progress.summary.premium')}{' '}
          <Link to="/parent/plan">{t('parent.children.seePlan')}</Link>
        </p>
      )}

      {progress.subjects.map((subject) => (
        <SubjectProgress
          key={subject.subjectId}
          name={subjectName(t, subject.subjectId)}
          strands={subject.strands}
          catalog={catalog}
        />
      ))}
    </>
  );
}

function SubjectProgress({
  name,
  strands,
  catalog,
}: {
  name: string;
  strands: readonly StrandProgress[];
  catalog: CatalogResponse;
}) {
  const { t, locale } = useI18n();
  const id = useId();
  const { skillGraph } = catalog;

  return (
    <section className="parent-section" aria-labelledby={id}>
      <h2 className="parent-page__heading" id={id}>
        {name}
      </h2>
      {strands.map((strand) => {
        const found = skillGraph.strands.find((candidate) => candidate.id === strand.strandId);
        return (
          <div key={strand.strandId} className="parent-strand">
            <h3 className="parent-strand__title">
              {found ? localizeContent(found.title, locale) : strand.strandId}
            </h3>
            {strand.skills ? (
              <ul className="parent-skills">
                {strand.skills.map(({ skillId, status, evidence }) => {
                  const info = skillGraph.skills.find((candidate) => candidate.id === skillId);
                  const started = status !== 'not-started' || evidence.firstTries > 0;
                  return (
                    <li key={skillId} className="parent-skills__skill">
                      <span className="parent-skills__name">
                        {info ? localizeContent(info.title, locale) : skillId}
                      </span>
                      <SkillStatus status={status} earlySignal={started && evidence.earlySignal} />
                      {evidence.firstTries > 0 && (
                        <span className="parent-skills__evidence">
                          {evidence.earlySignal
                            ? t('parent.progress.skills.early', { total: evidence.firstTries })
                            : t('parent.progress.skills.evidence', {
                                correct: evidence.firstTriesCorrect,
                                total: evidence.firstTries,
                                sessions: evidence.sessions,
                              })}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ul className="parent-summary">
                {strand.counts.map(({ status, count }) => (
                  <li key={status} className="parent-summary__count">
                    <SkillStatus status={status} />
                    <span>{t('parent.progress.summary.count', { count })}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
