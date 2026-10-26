import { EXPERIENCE_BANDS, ExperienceBand } from '@learnofun/contracts';

// The band IDs live in packages/contracts (ADR 0005); ui-kit re-exports them for components.
export { EXPERIENCE_BANDS, type ExperienceBand };

export function isExperienceBand(value: string): value is ExperienceBand {
  return ExperienceBand.safeParse(value).success;
}

/**
 * How the parental gate checks for an adult (plan 8.1): a times-table question in words stops
 * children up to 8; from age 9 the gate asks for the parent's PIN instead.
 */
export type GateMode = 'challenge' | 'pin';

const GATE_MODES: Record<ExperienceBand, GateMode> = {
  'early-years': 'challenge',
  'early-primary': 'challenge',
};

/** The gate for a band, from configuration, so no component ever checks a child's age. */
export function gateModeForBand(band: ExperienceBand): GateMode {
  return GATE_MODES[band];
}
