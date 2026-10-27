import {
  FAILURES,
  LATENCIES,
  clearMockState,
  getMockControls,
  setMockControls,
  type MockControls,
} from '@learnofun/mock-api';
import { useI18n } from '@learnofun/ui-kit';
import { useId, useState } from 'react';

/**
 * Development-only switches for the mock API's failure modes (FRONTEND-KICKOFF step 5). A change
 * reloads the page, so every request starts under the new setting.
 */
export function MockControlsPanel() {
  const { t } = useI18n();
  const [controls] = useState(getMockControls);
  const latencyId = useId();
  const failureId = useId();

  const apply = (next: MockControls) => {
    setMockControls(next);
    window.location.reload();
  };

  return (
    <aside className="flex flex-wrap items-end gap-3" aria-label={t('dev.mock.title')}>
      <div className="flex flex-col gap-1">
        <label htmlFor={latencyId}>{t('dev.mock.latency')}</label>
        <select
          id={latencyId}
          className="font-inherit"
          value={controls.latency}
          onChange={(event) => {
            const latency = LATENCIES.find((value) => value === event.target.value);
            if (latency) apply({ ...controls, latency });
          }}
        >
          {LATENCIES.map((value) => (
            <option key={value} value={value}>
              {t(`dev.mock.latencies.${value}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={failureId}>{t('dev.mock.failure')}</label>
        <select
          id={failureId}
          className="font-inherit"
          value={controls.failure}
          onChange={(event) => {
            const failure = FAILURES.find((value) => value === event.target.value);
            if (failure) apply({ ...controls, failure });
          }}
        >
          {FAILURES.map((value) => (
            <option key={value} value={value}>
              {t(`dev.mock.failures.${value}`)}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className="font-inherit"
        onClick={() => {
          clearMockState();
          window.location.reload();
        }}
      >
        {t('dev.mock.reset')}
      </button>
    </aside>
  );
}
