import type { ChildProfile, ChildProfileInput, FamilyResponse } from '@learnofun/contracts';
import { useI18n } from '@learnofun/ui-kit';
import { useEffect, type ReactNode } from 'react';
import { api } from '../api/client';
import { LoadState } from '../shared/LoadState';
import { Link, useNavigate, useQueryParam } from '../shared/navigation';
import { ChildProfileForm } from './ChildProfileForm';
import { canManageChildren, newProfileValues, profileValues } from './profile-form';
import { PlanLimit } from './PlanLimit';
import { noteSaved } from './saved-notice';
import { useFamily } from './use-family';
import { useMarket } from './use-market';

/** /parent/children/new: add a child to the family shown (ADR 0026). */
export function AddChildPage() {
  const { t } = useI18n();
  const family = useFamily();
  const title = t('parent.profile.addTitle');

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <>
      <h1 className="parent-page__title">{title}</h1>
      <LoadState result={family}>{(data) => <AddChild family={data} />}</LoadState>
    </>
  );
}

function AddChild({ family }: { family: FamilyResponse }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const market = useMarket(family.family.market);
  const max = family.entitlements.features['children.max'];

  if (!canManageChildren(family.role))
    return <BackToOverview>{t('parent.profile.notAllowed')}</BackToOverview>;
  if (family.children.length >= max) return <PlanLimit max={max} />;

  const add = async (input: ChildProfileInput) => {
    const { child } = await api.addChild(family.family.id, input);
    // Back to the overview, which says it was saved.
    noteSaved(child.nickname);
    void navigate('/parent');
  };

  return (
    <LoadState result={market}>
      {(config) => (
        <ChildProfileForm
          market={config}
          timeZone={family.family.timeZone}
          initial={newProfileValues(config)}
          submitLabel={t('parent.profile.add')}
          onSubmit={add}
          onCancel={() => {
            void navigate('/parent');
          }}
        />
      )}
    </LoadState>
  );
}

/** /parent/child?id=<child>: edit a child of the family shown; another family's is not here. */
export function EditChildPage() {
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
              <BackToOverview />
            </>
          );
        }
        if (!canManageChildren(data.role)) {
          return (
            <>
              <h1 className="parent-page__title">
                {t('parent.profile.editTitle', { nickname: child.nickname })}
              </h1>
              <BackToOverview>{t('parent.profile.notAllowed')}</BackToOverview>
            </>
          );
        }
        return <EditChild family={data} child={child} />;
      }}
    </LoadState>
  );
}

function EditChild({ family, child }: { family: FamilyResponse; child: ChildProfile }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const market = useMarket(family.family.market);
  const title = t('parent.profile.editTitle', { nickname: child.nickname });

  useEffect(() => {
    document.title = title;
  }, [title]);

  const save = async (input: ChildProfileInput) => {
    const { child: savedChild } = await api.editChild(family.family.id, child.id, input);
    noteSaved(savedChild.nickname);
    void navigate('/parent');
  };

  return (
    <>
      <h1 className="parent-page__title">{title}</h1>
      <LoadState result={market}>
        {(config) => (
          <ChildProfileForm
            market={config}
            timeZone={family.family.timeZone}
            initial={profileValues(child)}
            saved={child}
            submitLabel={t('parent.profile.save')}
            onSubmit={save}
            onCancel={() => {
              void navigate('/parent');
            }}
          />
        )}
      </LoadState>
    </>
  );
}

function BackToOverview({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  return (
    <>
      {children && <p>{children}</p>}
      <p>
        <Link to="/parent">{t('parent.profile.back')}</Link>
      </p>
    </>
  );
}
