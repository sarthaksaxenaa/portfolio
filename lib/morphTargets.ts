/**
 * Shapes the particles morph into, one per chapter. Every generator returns exactly
 * `count` points (x, y, z) in a normalised space of roughly [-1, 1], so any point i in one
 * shape has a partner i in every other shape and the GPU can blend them.
 * All randomness is seeded, so the shapes are identical on every visit and in tests.
 */

import { seeds } from "./sphere";

export type Road = { positions: Float32Array; along: Float32Array };

const rng = (seed: number) => {
  const s = seeds(1, seed)[0];
  let state = Math.floor(s * 4294967296) >>> 0 || 1;
  return () => {
    // xorshift32: fast, deterministic, good enough for scattering points
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
};

const n0 = (count: number) => Math.max(0, Math.floor(count));

/** A flat, slightly tilted lattice: the grind, rep after rep. */
export function grid(count: number): Float32Array {
  const n = n0(count);
  const out = new Float32Array(n * 3);
  if (n === 0) return out;
  const cols = Math.ceil(Math.sqrt(n * 1.8));
  const rows = Math.ceil(n / cols);
  for (let i = 0; i < n; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = cols === 1 ? 0 : (c / (cols - 1)) * 2 - 1;
    const y = rows === 1 ? 0 : (r / (rows - 1)) * 2 - 1;
    out[i * 3] = x;
    out[i * 3 + 1] = y * 0.62;
    out[i * 3 + 2] = -y * 0.35; // tilt back like a floor receding
  }
  return out;
}

/** Road segments of a small city: a grid of streets plus two avenues. */
export const ROADS: ReadonlyArray<readonly [number, number, number, number]> = [
  [-1, -0.6, 1, -0.6],
  [-1, -0.1, 1, -0.1],
  [-1, 0.45, 1, 0.45],
  [-0.75, -1, -0.75, 1],
  [-0.2, -1, -0.2, 1],
  [0.35, -1, 0.35, 1],
  [0.85, -1, 0.85, 1],
  [-1, -1, 0.9, 0.95], // avenue
  [-0.9, 0.95, 1, -0.4], // avenue
];

/**
 * Points spread along the roads. `along` is each point's position along its road (0..1),
 * which the shader uses to send pulses of light down the streets like moving cars.
 */
export function roads(count: number): Road {
  const n = n0(count);
  const positions = new Float32Array(n * 3);
  const along = new Float32Array(n);
  if (n === 0) return { positions, along };
  const lengths = ROADS.map(([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1));
  const total = lengths.reduce((a, b) => a + b, 0);
  const rand = rng(7);
  let i = 0;
  ROADS.forEach(([x1, y1, x2, y2], k) => {
    const share = k === ROADS.length - 1 ? n - i : Math.round((lengths[k] / total) * n);
    for (let j = 0; j < share && i < n; j++, i++) {
      const t = share === 1 ? 0.5 : j / (share - 1);
      const jitter = (rand() - 0.5) * 0.018; // a little width so roads read as lanes
      positions[i * 3] = x1 + (x2 - x1) * t + jitter;
      positions[i * 3 + 1] = y1 + (y2 - y1) * t + jitter;
      positions[i * 3 + 2] = (rand() - 0.5) * 0.04;
      along[i] = t;
    }
  });
  return { positions, along };
}

/** Signed-distance style test: is (x, y) inside the standing-figure silhouette? */
export function insideBody(x: number, y: number): boolean {
  const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
    ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const capsule = (ax: number, ay: number, bx: number, by: number, r: number) => {
    const vx = bx - ax;
    const vy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(x - (ax + vx * t), y - (ay + vy * t)) <= r;
  };
  return (
    ellipse(0, 0.78, 0.13, 0.16) || // head
    capsule(0, 0.6, 0, 0.55, 0.06) || // neck
    ellipse(0, 0.22, 0.26, 0.34) || // torso
    capsule(-0.24, 0.45, -0.42, -0.1, 0.07) || // left arm
    capsule(0.24, 0.45, 0.42, -0.1, 0.07) || // right arm
    capsule(-0.11, -0.08, -0.15, -0.95, 0.085) || // left leg
    capsule(0.11, -0.08, 0.15, -0.95, 0.085) // right leg
  );
}

/** A standing human figure: CareNexus's body map, in particles. */
export function body(count: number): Float32Array {
  const n = n0(count);
  const out = new Float32Array(n * 3);
  const rand = rng(11);
  let i = 0;
  let guard = 0;
  while (i < n && guard < n * 200) {
    guard++;
    const x = (rand() * 2 - 1) * 0.5;
    const y = rand() * 2 - 1;
    if (!insideBody(x, y)) continue;
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = (rand() - 0.5) * 0.12;
    i++;
  }
  return out;
}


/** Chapter → morph index used by the shader (0 portrait, 1 grid, 2 roads, 3 body, 4 sphere). */
export const MORPH_INDEX: Record<string, number> = {
  warmup: 0,
  work: 1, // the portrait dissolves into the grid behind the featured work
  grind: 1,
  rideshare: 2,
  carenexus: 3,
  skills: 4,
  cooldown: 4,
};

/** Inside "What I build", each demo reshapes the particles while it is on show: rides travel the
 *  roads, the triage check takes the body, and the test replay lays out the grid. */
export const FOCUS_MORPH: Record<string, number> = {
  realtime: 2,
  ai: 3,
  tested: 1,
};

/**
 * How visible the particles are per chapter. In the hero they are the portrait itself, so they
 * are at their brightest; elsewhere they sit faintly behind the text.
 */
export const CHAPTER_OPACITY: Record<string, number> = {
  warmup: 0.95, // the portrait is the hero
  work: 0.12,
  grind: 0.2,
  rideshare: 0.16,
  carenexus: 0.2,
  skills: 0.24,
  cooldown: 0.5,
};
