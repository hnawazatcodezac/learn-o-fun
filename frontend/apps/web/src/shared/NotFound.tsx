import { useI18n } from '@learnofun/ui-kit';
import { Link } from './navigation';

/** Shown for an unknown address. The link stays inside the app and inside the same area. */
export function NotFound({ homePath }: { homePath: string }) {
  const { t } = useI18n();

  return (
    <main className="placeholder" data-testid="not-found">
      <div>
        <h1 className="placeholder__title">{t('common.notFound.title')}</h1>
        <Link to={homePath}>{t('common.notFound.home')}</Link>
      </div>
    </main>
  );
}
