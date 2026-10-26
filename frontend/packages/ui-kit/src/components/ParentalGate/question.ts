/**
 * Factors for the times-table challenge: tables an adult knows by heart but children up to 8 do
 * not. The question is written in words, because this app teaches maths to 6–8-year-olds.
 */
export const GATE_FACTORS = [3, 4, 5, 6, 7, 8, 9] as const;

export type GateFactor = (typeof GATE_FACTORS)[number];

export interface GateQuestion {
  a: GateFactor;
  b: GateFactor;
}

/** A new times-table question. `random` returns numbers in [0, 1), like `Math.random`. */
export function makeGateQuestion(random: () => number): GateQuestion {
  const factor = (): GateFactor =>
    GATE_FACTORS[Math.floor(random() * GATE_FACTORS.length)] ?? GATE_FACTORS[0];
  return { a: factor(), b: factor() };
}

export function isGateAnswer(question: GateQuestion, entry: string): boolean {
  return entry !== '' && Number(entry) === question.a * question.b;
}
