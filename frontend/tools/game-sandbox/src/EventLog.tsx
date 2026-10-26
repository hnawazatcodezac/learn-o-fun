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
    <section className="sandbox-panel" aria-labelledby={headingId}>
      <h2 id={headingId} className="sandbox-panel__title">
        {t('dev.sandbox.log.title')}
      </h2>
      <p className="sandbox-panel__note">{t('dev.sandbox.log.count', { count: events.length })}</p>
      <ol ref={listRef} className="sandbox-log" data-testid="event-log">
        {events.map(({ event, invalid }) => (
          <li
            key={event.id}
            className="sandbox-log__entry"
            data-event-type={event.type}
            data-invalid={invalid === undefined ? undefined : 'true'}
          >
            <details>
              <summary>
                <span className="sandbox-log__sequence">{format.number(event.sequence)}</span>
                <code dir="ltr">{event.type}</code>
                {invalid !== undefined && (
                  <strong className="sandbox-log__invalid">{t('dev.sandbox.log.invalid')}</strong>
                )}
              </summary>
              <pre dir="ltr">{JSON.stringify(event, null, 2)}</pre>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}
