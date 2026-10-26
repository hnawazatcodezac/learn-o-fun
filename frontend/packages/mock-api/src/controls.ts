import { z } from 'zod';
import { browserStorage, type MockStorage } from './storage';

/** How slow a "slow" response is. */
export const SLOW_MS = 1500;

export const LATENCIES = ['none', 'slow'] as const;
export const FAILURES = ['none', 'offline', 'server-error'] as const;

/** Failure modes a developer can switch on (FRONTEND-KICKOFF step 5). */
export const MockControls = z.object({
  latency: z.enum(LATENCIES),
  failure: z.enum(FAILURES),
});

export type MockControls = z.infer<typeof MockControls>;

export const NORMAL_CONTROLS: MockControls = { latency: 'none', failure: 'none' };

export const STATE_KEY = 'learnofun.mock-api.state.v1';
export const CONTROLS_KEY = 'learnofun.mock-api.controls.v1';

export function readControls(storage: MockStorage): MockControls {
  try {
    const result = MockControls.safeParse(JSON.parse(storage.read() ?? 'null'));
    return result.success ? result.data : NORMAL_CONTROLS;
  } catch {
    return NORMAL_CONTROLS;
  }
}

export function writeControls(storage: MockStorage, controls: MockControls) {
  storage.write(JSON.stringify(MockControls.parse(controls)));
}

/** The current controls in this browser, for the development panel. */
export function getMockControls(): MockControls {
  return readControls(browserStorage(CONTROLS_KEY));
}

/** Changes the controls in this browser. They apply to the next request. */
export function setMockControls(controls: MockControls) {
  writeControls(browserStorage(CONTROLS_KEY), controls);
}

/** Forgets every change the mock API has saved in this browser. Reload to start from the data file. */
export function clearMockState() {
  browserStorage(STATE_KEY).remove();
}
