import { useI18n } from '@learnofun/ui-kit';
import { Link } from '../shared/navigation';
import { HINT_CLASSES } from './classes';

/**
 * Why no more children can be added: the plan's `children.max` (plan 9, ADR 0026), with the way
 * to the plan. Upgrades are offered here, in the dashboard, never in the child area.
 */
export function PlanLimit({ max, id }: { max: number; id?: string }) {
  const { t } = useI18n();
  return (
    <p id={id} className={HINT_CLASSES}>
      {t('parent.children.limit', { count: max })}{' '}
      <Link to="/parent/plan">{t('parent.children.seePlan')}</Link>
    </p>
  );
}
