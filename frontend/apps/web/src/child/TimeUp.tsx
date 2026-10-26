import { useI18n } from '@learnofun/ui-kit';
import type { ReactNode } from 'react';

/**
 * Shown instead of activities once the day's play is used up (plan 8.7, ADR 0022): calm, with no
 * countdown and no way round it for the child. A grown-up can allow more behind the gate.
 */
export function TimeUp({ nickname, children }: { nickname: string; children?: ReactNode }) {
  const { t } = useI18n();

  return (
    <section className="time-up" data-testid="time-up">
      <h2 className="time-up__title">{t('child.timeUp.title')}</h2>
      <p className="time-up__body">{t('child.timeUp.body', { nickname })}</p>
      {children}
    </section>
  );
}
