import { useI18n } from '@learnofun/ui-kit';
import { LOAD_STATE_CLASSES, PLACEHOLDER_CLASSES } from './page-classes';

/** Shown while a lazily loaded page arrives on the first visit. */
export function PageLoading() {
  const { t } = useI18n();

  return (
    <main className={PLACEHOLDER_CLASSES}>
      <p className={LOAD_STATE_CLASSES} role="status">
        {t('common.loading')}
      </p>
    </main>
  );
}
