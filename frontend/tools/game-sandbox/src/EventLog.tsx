import { useI18n } from '@learnofun/ui-kit';
import { useId, useLayoutEffect, useRef } from 'react';
import type { LoggedEvent } from './run';

/** Every learning event of the current session, in order; open one to see all its fields. */
export function EventLog({ events }: { events: readonly LoggedEvent[] }) {
  const { t, format } = useI18n();
  const headingId = useId();
  const listRef = useRef<HTMLOListElement>(null);

  // Keep the newest event in view.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [events.length]);

  return (
    <section className="flex flex-col gap-2 text-size-family-body" aria-labelledby={headingId}>
      <h2 id={headingId} className="m-0 text-size-family-heading">
        {t('dev.sandbox.log.title')}
      </h2>
      <p className="m-0 text-ink-muted">{t('dev.sandbox.log.count', { count: events.length })}</p>
      <ol
        ref={listRef}
        className="m-0 list-none overflow-auto p-0 text-size-family-small max-block-ui-tool-log"
        data-testid="event-log"
      >
        {events.map(({ event, invalid }) => (
          <li
            key={event.id}
            className="border-be border-line-strong data-invalid:border-s-4 data-invalid:border-s-sun data-invalid:ps-2"
            data-event-type={event.type}
            data-invalid={invalid === undefined ? undefined : 'true'}
          >
            <details>
              <summary className="flex cursor-pointer items-baseline gap-3 py-2">
                <span className="text-end text-ink-muted min-inline-ui-tool-number">
                  {format.number(event.sequence)}
                </span>
                <code dir="ltr">{event.type}</code>
                {invalid !== undefined && (
                  <strong className="text-ink">{t('dev.sandbox.log.invalid')}</strong>
                )}
              </summary>
              <pre dir="ltr" className="m-0 overflow-x-auto pbe-2 whitespace-pre">
                {JSON.stringify(event, null, 2)}
              </pre>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}
