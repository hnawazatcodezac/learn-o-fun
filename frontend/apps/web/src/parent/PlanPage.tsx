import type { Features } from '@learnofun/contracts';
import { Card, useI18n } from '@learnofun/ui-kit';
import { useEffect } from 'react';
import { LoadState } from '../shared/LoadState';
import { useFamily } from './use-family';

/** Each feature key, and how its value reads (plan 9). Code reads keys, never plan names. */
const FEATURES = [
  'children.max',
  'activities.tier',
  'insights.detail',
  'digest.weekly',
  'goals.custom',
] as const satisfies readonly (keyof Features)[];

type Translate = ReturnType<typeof useI18n>['t'];

/** How a feature's value reads, in the parent's language. */
function valueText(t: Translate, features: Features, key: (typeof FEATURES)[number]): string {
  switch (key) {
    case 'children.max':
      return t('parent.plan.values.children', { count: features[key] });
    case 'activities.tier':
      return features[key] === 'premium'
        ? t('parent.plan.values.activities.premium')
        : t('parent.plan.values.activities.free');
    case 'insights.detail':
      return features[key] === 'full'
        ? t('parent.plan.values.insights.full')
        : t('parent.plan.values.insights.basic');
    case 'digest.weekly':
    case 'goals.custom':
      return features[key] ? t('parent.plan.values.on') : t('parent.plan.values.off');
  }
}

/**
 * /parent/plan: what the family's plan includes, read from its feature keys (plan 9). A
 * placeholder until billing: there is nothing to buy yet. Upgrade offers only ever appear here, in
 * the parent dashboard, never in the child area.
 */
export function PlanPage() {
  const { t } = useI18n();
  const family = useFamily();
  const title = t('parent.plan.title');

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <>
      <h1 className="parent-page__title">{title}</h1>
      <LoadState result={family}>
        {({ entitlements }) => (
          <Card title={t('parent.plan.includes')}>
            <dl className="parent-plan" data-testid="plan-features">
              {FEATURES.map((key) => (
                <div key={key} className="parent-plan__row">
                  <dt>{t(`parent.plan.features.${key}`)}</dt>
                  <dd>{valueText(t, entitlements.features, key)}</dd>
                </div>
              ))}
            </dl>
            <p className="parent-plan__note">{t('parent.plan.billingLater')}</p>
          </Card>
        )}
      </LoadState>
    </>
  );
}
