/** Replay of CareNexus's test suite: the real test names (scripts/demos/export_carenexus.py), shown
 *  in the order CI runs them. Timing only; nothing here runs a test. */

export type TestData = {
  suites: [string, string, string];
  coverage: number;
  lastGreen: string;
  files: string[];
  /** [suite index, file index, test name] */
  tests: [number, number, string][];
};

export const REPLAY_MS = 4200;

/** Known before the test list downloads, so the grid and legend take their full size from the first
 *  paint and the page never grows under someone scrolling past (tests check it matches the data). */
export const TOTAL_TESTS = 570;
export const SUITES = ["backend · pytest", "frontend · vitest", "end to end · playwright"] as const;

/** How many tests have finished `ms` into the replay: quick through the bulk, easing at the end. */
export function doneAt(ms: number, total: number): number {
  if (total <= 0 || ms <= 0) return 0;
  const p = Math.min(1, ms / REPLAY_MS);
  return Math.min(total, Math.round(total * (1 - Math.pow(1 - p, 2.2))));
}

export function suiteCounts(data: Pick<TestData, "tests">): [number, number, number] {
  const c: [number, number, number] = [0, 0, 0];
  for (const [s] of data.tests) c[s as 0 | 1 | 2]++;
  return c;
}
