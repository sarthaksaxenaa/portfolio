/**
 * The forged name: pure maths for the heat lens, the idle heat wave and the 3D tilt.
 * Kept free of the DOM so it can be tested on its own.
 */

/** Lens radius, in multiples of the heading's font size. */
export const LENS_RADIUS_EM = 1.25;
/** One idle heat wave takes this long to cross the name. */
export const WAVE_MS = 1600;
/** The second line trails the first by this fraction of a wave. */
export const LINE_LAG = 0.14;
/** Quiet time before the first wave (after the entrance) and between waves. */
export const FIRST_WAVE_MS = 2400;
export const WAVE_GAP_MS = 6500;
/** Largest tilt of the whole name, in degrees. */
export const MAX_TILT = 7;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Heat at distance `d` from the lens centre: 1 at the centre, easing to 0 at `radius`. */
export function heatAt(d: number, radius: number): number {
  if (!(radius > 0)) return 0;
  const x = 1 - Math.abs(d) / radius;
  if (x <= 0) return 0;
  return x * x * (3 - 2 * x); // smoothstep: no hard edge where the lens ends
}

type Box = { left: number; top: number; width: number; height: number };

/** Tilt toward the pointer: x across the name turns it around Y, y turns it around X. */
export function tiltFor(px: number, py: number, box: Box, max = MAX_TILT): { rx: number; ry: number } {
  if (box.width <= 0 || box.height <= 0) return { rx: 0, ry: 0 };
  const nx = clamp((px - (box.left + box.width / 2)) / (box.width / 2), -1, 1);
  const ny = clamp((py - (box.top + box.height / 2)) / (box.height / 2), -1, 1);
  return { rx: -ny * max * 0.6, ry: nx * max };
}

/**
 * Where the idle wave is, horizontally, at `progress` (0 → 1) for a given line. It starts a
 * lens-width before the name and ends a lens-width after it, so it enters and leaves softly.
 */
export function waveX(progress: number, line: number, box: Box, radius: number): number {
  const p = clamp(progress - line * LINE_LAG, 0, 1);
  const eased = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2; // ease in-out
  const from = box.left - radius;
  const to = box.left + box.width + radius;
  return from + (to - from) * eased;
}

/** Whether a wave that started `elapsed` ms ago has left both lines. */
export function waveDone(elapsed: number): boolean {
  return elapsed / WAVE_MS > 1 + LINE_LAG;
}
