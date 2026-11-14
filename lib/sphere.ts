/**
 * Evenly spread points on a unit sphere using the Fibonacci (golden-angle) spiral.
 * Unlike random sampling it has no clumps or bald patches, so the dot sphere reads
 * as a clean surface at any particle count.
 */
export function fibonacciSphere(count: number): Float32Array {
  const n = Math.max(0, Math.floor(count));
  const out = new Float32Array(n * 3);
  if (n === 0) return out;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2; // 1 → -1
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    out[i * 3] = Math.cos(theta) * r;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = Math.sin(theta) * r;
  }
  return out;
}

/** Per-point random seed in [0, 1), deterministic so server tests and every visit look the same. */
export function seeds(count: number, seed = 1337): Float32Array {
  const out = new Float32Array(Math.max(0, Math.floor(count)));
  let s = seed >>> 0;
  for (let i = 0; i < out.length; i++) {
    // mulberry32
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    out[i] = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return out;
}
