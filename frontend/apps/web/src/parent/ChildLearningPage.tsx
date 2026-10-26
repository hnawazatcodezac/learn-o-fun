import {
  BREAK_REMINDER_STEPS,
  DAILY_LIMIT_STEPS,
  SESSION_MINUTE_STEPS,
  type ChildLearningResponse,
  type FamilyResponse,
  type SubjectId,
  type SubjectShare,
  type TimeLimits,
} from '@learnofun/contracts';
import { localizeContent } from '@learnofun/i18n';
import { Button, useI18n, WarningIcon } from '@learnofun/ui-kit';
import { useCallback, useEffect, useId, useState, type ReactNode, type SubmitEvent } from 'react';
import { Link, useQueryParam } from '../shared/navigation';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { LoadState } from '../shared/LoadState';
import { canManageChildren, dateIn } from './profile-form';
import { subjectName } from './subject-name';
import { useFamily } from './use-family';

/**
 * /parent/child/learning?id=<child>: a child's goal, subject balance and time limits
 * (ADR 0027). Each part saves on its own, for an owner or guardian.
 */
export function ChildLearningPage() {
  const { t } = useI18n();
  const family = useFamily();
  const childId = useQueryParam('id');

  return (
    <LoadState result={family}>
      {(data) => {
        const child = data.children.find((candidate) => candidate.id === childId);
        if (!child || !canManageChildren(data.role)) {
          return (
            <>
              <h1 className="parent-page__title">{t('parent.profile.notFound')}</h1>
              <p>
                <Link to="/parent">{t('parent.profile.back')}</Link>
              </p>
            </>
          );
        }
        return <Learning family={data} childId={child.id} />;
      }}
    </LoadState>
  );
}

function Learning({ family, childId }: { family: FamilyResponse; childId: string }) {
  const { t } = useI18n();
  const familyId = family.family.id;
  const load = useCallback(() => api.childLearning(familyId, childId), [familyId, childId]);
  const loaded = useApi(load);
  // Each save answers with the page as it now stands.
  const [latest, setLatest] = useState<ChildLearningResponse>();
  const learning = latest ?? (loaded.status === 'ready' ? loaded.data : undefined);
  const nickname = family.children.find((child) => child.id === childId)?.nickname ?? '';
  const title = t('parent.learning.title', { nickname });

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <>
      <h1 className="parent-page__title">{title}</h1>
      {learning ? (
        <>
          <GoalSection family={family} learning={learning} onSaved={setLatest} />
          {learning.subjects.length > 1 && (
            <BalanceSection familyId={familyId} learning={learning} onSaved={setLatest} />
          )}
          <TimeSection familyId={familyId} learning={learning} onSaved={setLatest} />
        </>
      ) : (
        <LoadState result={loaded}>{() => null}</LoadState>
      )}
    </>
  );
}

interface SectionProps {
  learning: ChildLearningResponse;
  onSaved: (learning: ChildLearningResponse) => void;
}

/** A part of the page with its own form, save button and messages. */
function Section({
  title,
  hint,
  saveLabel,
  saved,
  failed,
  problem,
  onSubmit,
  children,
}: {
  title: string;
  hint?: ReactNode;
  saveLabel: string;
  saved: string | undefined;
  failed: boolean;
  problem?: string | undefined;
  onSubmit: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const id = useId();
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <section className="parent-section" aria-labelledby={`${id}-title`}>
      <h2 className="parent-page__heading" id={`${id}-title`}>
        {title}
      </h2>
      {hint && <p className="parent-field__hint">{hint}</p>}
      <form className="parent-form" noValidate onSubmit={submit}>
        {children}
        {problem && <FieldMessage id={`${id}-problem`}>{problem}</FieldMessage>}
        {failed && (
          <FieldMessage id={`${id}-failed`} role="alert">
            {t('parent.learning.saveFailed')}
          </FieldMessage>
        )}
        <div className="parent-form__actions">
          <Button type="submit">{saveLabel}</Button>
          <p role="status" className="parent-section__saved">
            {saved}
          </p>
        </div>
      </form>
    </section>
  );
}

function FieldMessage({ id, role, children }: { id: string; role?: 'alert'; children: ReactNode }) {
  return (
    <p id={id} role={role} className="parent-field__error">
      <WarningIcon />
      <span>{children}</span>
    </p>
  );
}

/** Runs a save, keeping what the page says about it. */
function useSave(onSaved: (learning: ChildLearningResponse) => void) {
  const [saved, setSaved] = useState<string>();
  const [failed, setFailed] = useState(false);
  const save = (request: Promise<ChildLearningResponse>, message: string) => {
    setSaved(undefined);
    setFailed(false);
    request.then(
      (learning) => {
        onSaved(learning);
        setSaved(message);
      },
      () => {
        setFailed(true);
      },
    );
  };
  return { saved, failed, save };
}

/** A focus on a subject; on premium, also a skill and an end date (ADR 0027). */
function GoalSection({ family, learning, onSaved }: SectionProps & { family: FamilyResponse }) {
  const { t, locale } = useI18n();
  const id = useId();
  const custom = family.entitlements.features['goals.custom'];
  const { goal, child, subjects } = learning;
  const [subject, setSubject] = useState<SubjectId | ''>(goal?.subjectId ?? '');
  const [skillId, setSkillId] = useState(goal?.skillId ?? '');
  const [endsOn, setEndsOn] = useState(goal?.endsOn ?? '');
  const catalog = useApi(api.catalog);
  const { saved, failed, save } = useSave(onSaved);
  const today = dateIn(family.family.timeZone, new Date());
  const skills =
    catalog.status === 'ready' && subject !== ''
      ? catalog.data.skillGraph.skills.filter(
          (skill) =>
            skill.subjectId === subject &&
            (skill.learningLanguage === undefined ||
              skill.learningLanguage === child.learningLanguage),
        )
      : [];

  const submit = () => {
    if (subject === '') {
      save(api.clearGoal(family.family.id, child.id), t('parent.learning.goal.cleared'));
      return;
    }
    save(
      api.saveGoal(family.family.id, child.id, {
        subjectId: subject,
        ...(custom && skillId !== '' ? { skillId } : {}),
        ...(custom && endsOn !== '' ? { endsOn } : {}),
      }),
      t('parent.learning.goal.saved'),
    );
  };

  return (
    <Section
      title={t('parent.learning.goal.title')}
      hint={t('parent.learning.goal.hint')}
      saveLabel={t('parent.learning.goal.save')}
      saved={saved}
      failed={failed}
      onSubmit={submit}
    >
      <fieldset className="parent-field">
        <legend>{t('parent.learning.goal.focus')}</legend>
        <div className="parent-choices">
          {(['', ...subjects] as const).map((option) => (
            <label key={option} className="parent-choice">
              <input
                type="radio"
                name={`${id}-focus`}
                value={option}
                checked={subject === option}
                onChange={() => {
                  setSubject(option);
                  setSkillId('');
                }}
              />
              {option === '' ? t('parent.learning.goal.none') : subjectName(t, option)}
            </label>
          ))}
        </div>
      </fieldset>
      {custom ? (
        subject !== '' && (
          <>
            <div className="parent-field">
              <label htmlFor={`${id}-skill`}>{t('parent.learning.goal.skill')}</label>
              <select
                id={`${id}-skill`}
                value={skillId}
                onChange={(event) => {
                  setSkillId(event.target.value);
                }}
              >
                <option value="">{t('parent.learning.goal.anySkill')}</option>
                {skills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {localizeContent(skill.title, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div className="parent-field">
              <label htmlFor={`${id}-ends`}>{t('parent.learning.goal.endsOn')}</label>
              <input
                id={`${id}-ends`}
                type="date"
                value={endsOn}
                min={today}
                onChange={(event) => {
                  setEndsOn(event.target.value);
                }}
              />
            </div>
          </>
        )
      ) : (
        <p className="parent-field__hint">
          {t('parent.learning.goal.premium')}{' '}
          <Link to="/parent/plan">{t('parent.children.seePlan')}</Link>
        </p>
      )}
    </Section>
  );
}

/** A share for each subject, in 10% steps adding up to 100 (ADR 0025). */
function BalanceSection({ familyId, learning, onSaved }: SectionProps & { familyId: string }) {
  const { t, format } = useI18n();
  const id = useId();
  const [shares, setShares] = useState<SubjectShare[]>(learning.subjectBalance);
  const [problem, setProblem] = useState<string>();
  const { saved, failed, save } = useSave(onSaved);
  const percent = (value: number) => format.number(value / 100, { style: 'percent' });
  const steps = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  const change = (subjectId: SubjectId, value: number) => {
    setShares((current) =>
      current.map((share) => {
        if (share.subjectId === subjectId) return { ...share, percent: value };
        // With two subjects, the other takes the rest.
        return current.length === 2 ? { ...share, percent: 100 - value } : share;
      }),
    );
  };

  const submit = () => {
    const total = shares.reduce((sum, share) => sum + share.percent, 0);
    if (total !== 100) {
      setProblem(t('parent.learning.balance.total', { total: percent(total) }));
      return;
    }
    setProblem(undefined);
    save(api.saveBalance(familyId, learning.child.id, shares), t('parent.learning.balance.saved'));
  };

  return (
    <Section
      title={t('parent.learning.balance.title')}
      hint={t('parent.learning.balance.hint')}
      saveLabel={t('parent.learning.balance.save')}
      saved={saved}
      failed={failed}
      problem={problem}
      onSubmit={submit}
    >
      <div className="parent-field__row">
        {shares.map((share) => (
          <div key={share.subjectId} className="parent-field__part">
            <label htmlFor={`${id}-${share.subjectId}`}>{subjectName(t, share.subjectId)}</label>
            <select
              id={`${id}-${share.subjectId}`}
              value={share.percent}
              onChange={(event) => {
                change(share.subjectId, Number(event.target.value));
              }}
            >
              {steps.map((step) => (
                <option key={step} value={step}>
                  {percent(step)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </Section>
  );
}

/** Session length, the day's play and the break reminder, from set steps (ADR 0027). */
function TimeSection({ familyId, learning, onSaved }: SectionProps & { familyId: string }) {
  const { t } = useI18n();
  const id = useId();
  const [limits, setLimits] = useState<TimeLimits>(learning.timeLimits);
  const [problem, setProblem] = useState<string>();
  const { saved, failed, save } = useSave(onSaved);
  const minutes = (count: number) => t('parent.learning.time.minutes', { count });

  const submit = () => {
    if (limits.sessionMinutes > limits.dailyLimitMinutes) {
      setProblem(t('parent.learning.time.tooLong'));
      return;
    }
    setProblem(undefined);
    save(api.saveTimeLimits(familyId, learning.child.id, limits), t('parent.learning.time.saved'));
  };

  const menu = (key: keyof TimeLimits, label: string, steps: readonly number[]) => (
    <div className="parent-field__part">
      <label htmlFor={`${id}-${key}`}>{label}</label>
      <select
        id={`${id}-${key}`}
        value={limits[key]}
        onChange={(event) => {
          setLimits((current) => ({ ...current, [key]: Number(event.target.value) }));
        }}
      >
        {steps.map((step) => (
          <option key={step} value={step}>
            {minutes(step)}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <Section
      title={t('parent.learning.time.title')}
      hint={t('parent.learning.time.hint')}
      saveLabel={t('parent.learning.time.save')}
      saved={saved}
      failed={failed}
      problem={problem}
      onSubmit={submit}
    >
      <div className="parent-field__row">
        {menu('sessionMinutes', t('parent.learning.time.session'), SESSION_MINUTE_STEPS)}
        {menu('dailyLimitMinutes', t('parent.learning.time.daily'), DAILY_LIMIT_STEPS)}
        {menu('breakReminderMinutes', t('parent.learning.time.break'), BREAK_REMINDER_STEPS)}
      </div>
    </Section>
  );
}
