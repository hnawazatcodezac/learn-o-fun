import { ageInMonth, type FamilyResponse, type MarketConfig } from '@learnofun/contracts';
import { localizeContent } from '@learnofun/i18n';
import { AVATARS, Avatar, Button, Card, isAvatarId, useI18n } from '@learnofun/ui-kit';
import { useEffect, useId, useState } from 'react';
import { LoadState } from '../shared/LoadState';
import { Link, useNavigate } from '../shared/navigation';
import { PlanLimit } from './PlanLimit';
import { canManageChildren, monthIn } from './profile-form';
import { clearSaved, readSaved } from './saved-notice';
import { useFamily } from './use-family';
import { useMarket } from './use-market';
import {
  ACTIONS_CLASSES,
  CARD_LINK_CLASSES,
  HEADING_CLASSES,
  SECTION_CLASSES,
  TITLE_CLASSES,
  WRAPPING_LIST_CLASSES,
} from './classes';

/** /parent: the family at a glance, with its children. */
export function ParentHome() {
  const { t } = useI18n();
  const family = useFamily();
  const title = t('parent.home.title');
  const saved = useSavedNickname();

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <>
      <h1 className={TITLE_CLASSES}>{title}</h1>
      <p
        role="status"
        className="rounded-md bg-ui-selected px-3 py-2 text-ui-on-selected"
        hidden={saved === undefined}
      >
        {saved !== undefined && t('parent.profile.saved', { nickname: saved })}
      </p>
      <LoadState result={family}>{(data) => <Children family={data} />}</LoadState>
    </>
  );
}

/**
 * The nickname of a profile just saved, from the page that saved it. It is forgotten at once, so
 * going back or reloading does not say it again.
 */
function useSavedNickname(): string | undefined {
  const [saved] = useState(readSaved);

  useEffect(() => {
    if (saved !== undefined) clearSaved();
  }, [saved]);
  return saved;
}

function Children({ family }: { family: FamilyResponse }) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const market = useMarket(family.family.market);
  const headingId = useId();
  const limitId = useId();
  const { children, role } = family;
  const max = family.entitlements.features['children.max'];
  const manage = canManageChildren(role);
  const atLimit = children.length >= max;
  /** A school year's name in the reader's language, as the market's grade scheme gives it. */
  const gradeName = (config: MarketConfig, grade: string) => {
    const found = config.gradeScheme.grades.find((candidate) => candidate.id === grade);
    return found ? localizeContent(found.name, locale) : undefined;
  };

  return (
    <section className={SECTION_CLASSES} aria-labelledby={headingId}>
      <h2 className={HEADING_CLASSES} id={headingId}>
        {t('parent.children.title')}
      </h2>
      {children.length === 0 ? (
        <p>{t('parent.home.noChildren')}</p>
      ) : (
        <ul className={WRAPPING_LIST_CLASSES}>
          {children.map((child) => (
            <li key={child.id}>
              <Card title={<span data-user-content>{child.nickname}</span>} headingLevel={3}>
                <span className="block block-7 inline-7">
                  <Avatar id={isAvatarId(child.avatarId) ? child.avatarId : AVATARS[0]} />
                </span>
                <div className="flex flex-col gap-1 text-family-small text-ink-muted">
                  <p>
                    {t('parent.children.age', {
                      age: ageInMonth(child, monthIn(family.family.timeZone, new Date())),
                    })}
                  </p>
                  {child.grade !== undefined && market.status === 'ready' && (
                    <p>{gradeName(market.data, child.grade)}</p>
                  )}
                </div>
                {manage && (
                  <div className="flex flex-col">
                    <Link
                      className={CARD_LINK_CLASSES}
                      to={`/parent/child/progress?id=${child.id}`}
                      aria-label={t('parent.children.progressFor', { nickname: child.nickname })}
                    >
                      {t('parent.children.progress')}
                    </Link>
                    <Link
                      className={CARD_LINK_CLASSES}
                      to={`/parent/child/sessions?id=${child.id}`}
                      aria-label={t('parent.children.historyFor', { nickname: child.nickname })}
                    >
                      {t('parent.children.history')}
                    </Link>
                    <Link
                      className={CARD_LINK_CLASSES}
                      to={`/parent/child/learning?id=${child.id}`}
                      aria-label={t('parent.children.learningFor', { nickname: child.nickname })}
                    >
                      {t('parent.children.learning')}
                    </Link>
                    <Link
                      className={CARD_LINK_CLASSES}
                      to={`/parent/child?id=${child.id}`}
                      aria-label={t('parent.children.editFor', { nickname: child.nickname })}
                    >
                      {t('parent.children.edit')}
                    </Link>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      {manage && (
        <div className={ACTIONS_CLASSES}>
          <Button
            disabled={atLimit}
            aria-describedby={atLimit ? limitId : undefined}
            onClick={() => {
              navigate('/parent/children/new');
            }}
          >
            {t('parent.children.add')}
          </Button>
          {atLimit && <PlanLimit id={limitId} max={max} />}
        </div>
      )}
    </section>
  );
}
