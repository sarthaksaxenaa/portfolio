/**
 * Turns a portrait image into particle targets: brighter pixels are more likely to get a
 * particle, so the face reads as dense light and the dark background stays empty.
 * Pure (works on raw RGBA bytes) so it can be tested without a browser.
 */

export const PORTRAIT_SRC = "/portrait-halftone.webp";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** Relative luminance (0–1) of every pixel in an RGBA buffer. */
export function luminance(rgba: ArrayLike<number>, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i++) {
    const r = rgba[i * 4] / 255;
    const g = rgba[i * 4 + 1] / 255;
    const b = rgba[i * 4 + 2] / 255;
    const a = rgba[i * 4 + 3] / 255;
    out[i] = (0.2126 * r + 0.7152 * g + 0.0722 * b) * a;
  }
  return out;
}

/**
 * `count` points as [x, y, brightness] triples. x and y are centred on the image: y runs
 * -0.5 (bottom) to 0.5 (top) and x keeps the image's aspect ratio. Pixels darker than
 * `floor` never get a particle; above it the chance grows with brightness to the power `gamma`.
 */
export function samplePortrait(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  count: number,
  { floor = 0.12, gamma = 1.4, seed = 17 }: { floor?: number; gamma?: number; seed?: number } = {},
): Float32Array {
  const out = new Float32Array(count * 3);
  if (width <= 0 || height <= 0 || count <= 0) return out;
  const lum = luminance(rgba, width, height);
  // Candidate pixels and their weights, then a cumulative table to draw from.
  const idx: number[] = [];
  const cum: number[] = [];
  let total = 0;
  for (let i = 0; i < lum.length; i++) {
    if (lum[i] <= floor) continue;
    total += ((lum[i] - floor) / (1 - floor)) ** gamma;
    idx.push(i);
    cum.push(total);
  }
  if (!idx.length) return out; // a black image: every particle waits at the centre
  const rand = rng(seed);
  const aspect = width / height;
  for (let p = 0; p < count; p++) {
    const r = rand() * total;
    let lo = 0;
    let hi = cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    const i = idx[lo];
    const px = (i % width) + rand(); // jitter within the pixel so points never sit on a grid
    const py = Math.floor(i / width) + rand();
    out[p * 3] = (px / width - 0.5) * aspect;
    out[p * 3 + 1] = 0.5 - py / height;
    out[p * 3 + 2] = lum[i];
  }
  return out;
}

/** Eased, per-particle progress of the burst: early seeds leave the dot first. */
export function burstProgress(intro: number, seed: number): number {
  const t = Math.min(1, Math.max(0, intro * 1.6 - seed * 0.6));
  return 1 - (1 - t) ** 3;
}
