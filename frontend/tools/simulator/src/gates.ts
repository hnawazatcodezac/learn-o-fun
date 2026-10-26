import type { SimulationReport } from './simulate';

/** One release gate (plan 4.6, ADR 0031). */
export interface Gate {
  name: string;
  value: number;
  target: string;
  passes: boolean;
  /** A required gate that fails fails CI. */
  required: boolean;
  /** Why a gate is reported but not yet required, and until when. */
  pending?: string;
}

/**
 * Plan 4.6's release gates, never loosened to pass. The success zone counts the core block's
 * targets, the items the policy aims at it (ADR 0033). No estimate of a child's ability can reach
 * its 70% from a first session, so it is reported until a learning designer sets a target the
 * evidence allows (ADR 0034).
 */
export function gates(report: SimulationReport): Gate[] {
  return [
    {
      name: 'False mastery',
      value: report.falseMastery,
      target: 'under 5%',
      passes: report.mastered > 0 && report.falseMastery < 0.05,
      required: true,
    },
    {
      name: 'Core-block targets in the success zone',
      value: report.targetsInZone,
      target: 'at least 70%',
      passes: report.targetsInZone >= 0.7,
      required: false,
      pending: 'its target is with a learning designer, ADR 0034',
    },
    {
      name: 'Sessions with a scaffold loop',
      value: report.scaffoldLoops,
      target: 'under 2%',
      passes: report.scaffoldLoops < 0.02,
      required: true,
    },
    {
      name: 'Streaks of 3 first-try errors per session',
      value: report.errorStreaksPerSession,
      target: 'under 1',
      passes: report.errorStreaksPerSession < 1,
      required: true,
    },
  ];
}

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

/** The report as a table for the console and CI logs. */
export function formatReport(report: SimulationReport, results: readonly Gate[]): string {
  const lines = [
    `Simulated ${String(report.learners)} learners; ${String(report.mastered)} reached Mastered.`,
    `Median items to mastery: ${report.itemsToMastery === undefined ? 'none' : String(report.itemsToMastery)}`,
    `Every item in the success zone, warm-ups and endings included: ${percent(report.successZone)}`,
    '',
    ...results.map((gate) => {
      const shown = gate.name.startsWith('Streaks') ? gate.value.toFixed(2) : percent(gate.value);
      const verdict = gate.passes
        ? 'pass'
        : gate.required
          ? 'FAIL'
          : `FAIL, not yet required (${gate.pending ?? 'reported'})`;
      return `${gate.required ? 'required' : 'reported'}  ${gate.name}: ${shown} (${gate.target}) — ${verdict}`;
    }),
  ];
  return lines.join('\n');
}
