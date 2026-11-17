/** Maths for the featured-work laptops, free of the DOM so it can be tested. */

export const MAX_TILT = 6; // degrees

/**
 * Which shot a laptop shows at a scroll `progress` (0 as it enters the screen from below,
 * 1 as it leaves at the top). The middle 70% of the pass is shared out evenly, so the first
 * screen is up as it arrives and the last one stays while it leaves.
 */
export function shotFor(progress: number, count: number): number {
  if (count <= 1) return 0;
  const p = (progress - 0.15) / 0.7;
  return Math.min(count - 1, Math.max(0, Math.floor(p * count)));
}

/** Lean toward a point given as 0–1 across and down the laptop: right turns it, top tips it back. */
export function deviceTilt(x: number, y: number, max = MAX_TILT): { rx: number; ry: number } {
  const cx = Math.min(1, Math.max(0, x)) - 0.5;
  const cy = Math.min(1, Math.max(0, y)) - 0.5;
  const round = (v: number) => Math.round(v * 100) / 100 + 0; // + 0 turns -0 into 0
  return { rx: round(-cy * 2 * max * 0.6), ry: round(cx * 2 * max) };
}
