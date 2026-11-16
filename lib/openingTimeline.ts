/**
 * The first-visit opening, as pure functions of time so it can be tested without a browser:
 * a dot drifts, stretches into a pen, writes the name with a spark, holds, flips letter by
 * letter into PORTFOLIO, then settles onto the hero's own word.
 */

export const NAME = "SARTHAK";
export const WORD = "PORTFOLIO";

/** Phase lengths in ms, in order. */
export const PHASES = [
  ["drift", 1300],
  ["ignite", 500],
  ["write", 1700],
  ["hold", 900],
  ["morph", 1300],
  ["settle", 900],
  ["reveal", 800],
] as const;

export type PhaseName = (typeof PHASES)[number][0];
export const TOTAL_MS = PHASES.reduce((t, [, ms]) => t + ms, 0);

/** When each phase starts. */
export const START: Record<PhaseName, number> = (() => {
  let t = 0;
  const out = {} as Record<PhaseName, number>;
  for (const [name, ms] of PHASES) {
    out[name] = t;
    t += ms;
  }
  return out;
})();

/** The phase at time `t` and how far through it we are (0–1). Past the end: reveal, 1. */
export function phaseAt(t: number): { name: PhaseName; p: number } {
  const clamped = Math.max(0, t);
  for (const [name, ms] of PHASES) {
    if (clamped < START[name] + ms) return { name, p: (clamped - START[name]) / ms };
  }
  return { name: "reveal", p: 1 };
}

export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
export const easeOut = (x: number) => 1 - (1 - x) ** 3;

/**
 * The morph from the name to PORTFOLIO: slot i flips at its own moment, left to right.
 * Returns, per slot, the letter showing and the flip progress (0 = edge-on, 1 = flat).
 * Slots the name does not have are empty until their turn.
 */
export function morphSlots(p: number, from = NAME, to = WORD): { ch: string; open: number }[] {
  const n = Math.max(from.length, to.length);
  return Array.from({ length: n }, (_, i) => {
    const at = (i / n) * 0.75; // the last slot starts flipping at 75% of the phase
    const local = Math.min(1, Math.max(0, (p - at) / 0.25));
    // First half of the flip closes the old letter, second half opens the new one.
    if (local < 0.5) return { ch: from[i] ?? "", open: 1 - local * 2 };
    return { ch: to[i] ?? "", open: (local - 0.5) * 2 };
  });
}

/** Where the writing head is, from 0 (start of the name) to 1 (its end). */
export function writeHead(p: number): number {
  return easeInOut(Math.min(1, Math.max(0, p)));
}

/** The opening is skippable: a click, tap, key or wheel jumps straight to the settle. */
export function skipTarget(t: number): number {
  return Math.max(t, START.settle);
}
