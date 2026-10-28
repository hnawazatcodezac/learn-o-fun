import { useI18n } from '@learnofun/ui-kit';
import type { ReactNode } from 'react';

/**
 * Shown instead of activities once the day's play is used up (plan 8.7, ADR 0022): calm, with no
 * countdown and no way round it for the child. A grown-up can allow more behind the gate. On a
 * page of its own, its title is the page's top heading.
 */
export function TimeUp({
  nickname,
  heading: Heading = 'h2',
  children,
}: {
  nickname: string;
  heading?: 'h1' | 'h2';
  children?: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <section
      className="flex flex-col items-center gap-3 text-center max-inline-measure"
      data-testid="time-up"
    >
      <Heading className="m-0 font-display text-play-title">{t('child.timeUp.title')}</Heading>
      <p className="m-0">{t('child.timeUp.body', { nickname })}</p>
      {children}
    </section>
  );
}
