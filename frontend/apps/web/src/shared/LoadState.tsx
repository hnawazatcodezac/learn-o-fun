import { Button, useI18n } from '@learnofun/ui-kit';
import type { ReactNode } from 'react';
import type { ApiResult } from '../api/useApi';

/** Shows loading and error states, or the data once it has arrived. */
export function LoadState<T>({
  result,
  children,
}: {
  result: ApiResult<T>;
  children: (data: T) => ReactNode;
}) {
  const { t } = useI18n();

  if (result.status === 'loading') {
    return (
      <p className="load-state" role="status">
        {t('common.loading')}
      </p>
    );
  }
  if (result.status === 'error') {
    return (
      <div className="load-state" role="alert">
        <p className="load-state__title">{t('common.loadError.title')}</p>
        <p>{t('common.loadError.body')}</p>
        <Button onClick={result.retry}>{t('common.retry')}</Button>
      </div>
    );
  }
  return children(result.data);
}
