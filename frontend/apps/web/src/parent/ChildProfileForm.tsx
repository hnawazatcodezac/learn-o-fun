import type { ChildProfile, ChildProfileInput, MarketConfig } from '@learnofun/contracts';
import { localizeContent } from '@learnofun/i18n';
import { AvatarPicker, Button, useI18n, WarningIcon } from '@learnofun/ui-kit';
import { useId, useRef, useState, type ReactNode, type SubmitEvent } from 'react';
import {
  birthYears,
  checkProfile,
  monthIn,
  type ProfileError,
  type ProfileErrors,
  type ProfileValues,
} from './profile-form';
import {
  ACTIONS_CLASSES,
  CONTROL_CLASSES,
  ERROR_CLASSES,
  FIELD_CLASSES,
  FIELD_PART_CLASSES,
  FIELD_ROW_CLASSES,
  FORM_CLASSES,
  HINT_CLASSES,
  TEXT_CONTROL_CLASSES,
} from './classes';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

interface ChildProfileFormProps {
  market: MarketConfig;
  /** The family's time zone, where ages are counted. */
  timeZone: string;
  initial: ProfileValues;
  /** The profile being edited, if any: its birth keeps fitting even past the ages. */
  saved?: ChildProfile;
  submitLabel: string;
  /** Saves the profile; a rejection shows that it could not be saved. */
  onSubmit: (input: ChildProfileInput) => Promise<void>;
  onCancel: () => void;
}

/**
 * A child's profile, to add or edit (ADR 0026): only the nickname, the birth month and year, the
 * learning language, an optional school year and the picture (CLAUDE.md rule 7). It checks
 * itself as the API will and moves focus to the first thing to change.
 */
export function ChildProfileForm({
  market,
  timeZone,
  initial,
  saved,
  submitLabel,
  onSubmit,
  onCancel,
}: ChildProfileFormProps) {
  const { t, locale, format } = useI18n();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const nicknameRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLSelectElement>(null);
  const id = useId();
  const ids = {
    nickname: `${id}-nickname`,
    month: `${id}-month`,
    year: `${id}-year`,
    language: `${id}-language`,
    grade: `${id}-grade`,
  };
  const years = birthYears(monthIn(timeZone, new Date()), saved?.birthYear);

  const set = (change: Partial<ProfileValues>) => {
    setValues((current) => ({ ...current, ...change }));
  };

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const result = checkProfile(values, monthIn(timeZone, new Date()), saved);
    if ('errors' in result) {
      setErrors(result.errors);
      (result.errors.nickname ? nicknameRef : monthRef).current?.focus();
      return;
    }
    setErrors({});
    setFailed(false);
    setSaving(true);
    onSubmit(result.input).then(
      () => {
        setSaving(false);
      },
      () => {
        setSaving(false);
        setFailed(true);
      },
    );
  };

  /** Says what to change, in words beside an icon: danger is never colour alone. */
  const message = (error: ProfileError): string => {
    switch (error.key) {
      case 'nicknameMissing':
        return t('parent.profile.errors.nicknameMissing');
      case 'nicknameTooLong':
        return t('parent.profile.errors.nicknameTooLong', { max: error.max });
      case 'birthMissing':
        return t('parent.profile.errors.birthMissing');
      case 'ageOutOfRange':
        return t('parent.profile.errors.ageOutOfRange', { min: error.min, max: error.max });
    }
  };
  const describedBy = (...parts: (string | false | undefined)[]) =>
    parts.filter(Boolean).join(' ') || undefined;

  return (
    <form className={FORM_CLASSES} noValidate onSubmit={submit}>
      <div className={FIELD_CLASSES}>
        <label htmlFor={ids.nickname}>{t('parent.profile.nickname.label')}</label>
        <p id={`${ids.nickname}-hint`} className={HINT_CLASSES}>
          {t('parent.profile.nickname.hint')}
        </p>
        <input
          ref={nicknameRef}
          id={ids.nickname}
          type="text"
          className={TEXT_CONTROL_CLASSES}
          autoComplete="off"
          spellCheck={false}
          required
          value={values.nickname}
          aria-invalid={errors.nickname ? true : undefined}
          aria-describedby={describedBy(
            `${ids.nickname}-hint`,
            errors.nickname && `${ids.nickname}-error`,
          )}
          onChange={(event) => {
            set({ nickname: event.target.value });
          }}
        />
        {errors.nickname && (
          <FieldError id={`${ids.nickname}-error`}>{message(errors.nickname)}</FieldError>
        )}
      </div>

      <fieldset
        className={FIELD_CLASSES}
        aria-describedby={describedBy(`${id}-birth-hint`, errors.birth && `${id}-birth-error`)}
      >
        <legend>{t('parent.profile.birth.legend')}</legend>
        <p id={`${id}-birth-hint`} className={HINT_CLASSES}>
          {t('parent.profile.birth.hint')}
        </p>
        <div className={FIELD_ROW_CLASSES}>
          <div className={FIELD_PART_CLASSES}>
            <label htmlFor={ids.month}>{t('parent.profile.birth.month')}</label>
            <select
              className={CONTROL_CLASSES}
              ref={monthRef}
              id={ids.month}
              required
              value={values.birthMonth ?? ''}
              aria-invalid={errors.birth ? true : undefined}
              onChange={(event) => {
                set({ birthMonth: event.target.value ? Number(event.target.value) : undefined });
              }}
            >
              <option value="">{t('parent.profile.birth.choose')}</option>
              {MONTHS.map((month) => (
                <option key={month} value={month}>
                  {format.monthName(month)}
                </option>
              ))}
            </select>
          </div>
          <div className={FIELD_PART_CLASSES}>
            <label htmlFor={ids.year}>{t('parent.profile.birth.year')}</label>
            <select
              className={CONTROL_CLASSES}
              id={ids.year}
              required
              value={values.birthYear ?? ''}
              aria-invalid={errors.birth ? true : undefined}
              onChange={(event) => {
                set({ birthYear: event.target.value ? Number(event.target.value) : undefined });
              }}
            >
              <option value="">{t('parent.profile.birth.choose')}</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {format.number(year, { useGrouping: false })}
                </option>
              ))}
            </select>
          </div>
        </div>
        {errors.birth && <FieldError id={`${id}-birth-error`}>{message(errors.birth)}</FieldError>}
      </fieldset>

      <div className={FIELD_CLASSES}>
        <label htmlFor={ids.language}>{t('parent.profile.learningLanguage.label')}</label>
        <p id={`${ids.language}-hint`} className={HINT_CLASSES}>
          {t('parent.profile.learningLanguage.hint')}
        </p>
        <select
          className={CONTROL_CLASSES}
          id={ids.language}
          value={values.learningLanguage}
          aria-describedby={`${ids.language}-hint`}
          onChange={(event) => {
            set({ learningLanguage: event.target.value });
          }}
        >
          {market.learningLanguages.map((code) => (
            <option key={code} value={code}>
              {format.languageName(code)}
            </option>
          ))}
        </select>
      </div>

      <div className={FIELD_CLASSES}>
        <label htmlFor={ids.grade}>{t('parent.profile.grade.label')}</label>
        <select
          className={CONTROL_CLASSES}
          id={ids.grade}
          value={values.grade}
          onChange={(event) => {
            set({ grade: event.target.value });
          }}
        >
          <option value="">{t('parent.profile.grade.notSet')}</option>
          {market.gradeScheme.grades.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {localizeContent(grade.name, locale)}
            </option>
          ))}
        </select>
      </div>

      <div className={FIELD_CLASSES}>
        <AvatarPicker
          label={t('parent.profile.avatar.label')}
          value={values.avatarId}
          describedBy={`${id}-avatar-hint`}
          onChange={(avatarId) => {
            set({ avatarId });
          }}
        />
        <p id={`${id}-avatar-hint`} className={HINT_CLASSES}>
          {t('parent.profile.avatar.hint')}
        </p>
      </div>

      {failed && (
        <FieldError id={`${id}-failed`} role="alert">
          {t('parent.profile.saveFailed')}
        </FieldError>
      )}
      <div className={ACTIONS_CLASSES}>
        <Button type="submit" aria-disabled={saving || undefined}>
          {submitLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('parent.profile.cancel')}
        </Button>
      </div>
    </form>
  );
}

function FieldError({ id, role, children }: { id: string; role?: 'alert'; children: ReactNode }) {
  return (
    <p id={id} role={role} className={ERROR_CLASSES}>
      <WarningIcon />
      <span>{children}</span>
    </p>
  );
}
