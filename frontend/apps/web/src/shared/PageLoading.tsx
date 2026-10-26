import { useI18n } from '@learnofun/ui-kit';

/** Shown while a lazily loaded page arrives on the first visit. */
export function PageLoading() {
  const { t } = useI18n();

  return (
    <main className="placeholder">
      <p className="load-state" role="status">
        {t('common.loading')}
      </p>
    </main>
  );
}
