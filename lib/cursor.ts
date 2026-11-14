/**
 * Pure helpers for the cursor light. Kept free of DOM access so they are unit-testable.
 */

export type CursorMode = "full" | "off";

export type Environment = {
  /** matchMedia("(pointer: fine)") — a mouse or trackpad, not a finger */
  finePointer: boolean;
  /** matchMedia("(prefers-reduced-motion: reduce)") */
  reducedMotion: boolean;
  /** The site's own MOTION OFF switch (added in v0.4); false until then */
  motionOff?: boolean;
};

/** Touch devices have no hover, and reduced-motion users get no moving light. */
export function cursorMode(env: Environment): CursorMode {
  if (!env.finePointer) return "off";
  if (env.reducedMotion || env.motionOff) return "off";
  return "full";
}

/**
 * Frame-rate independent smoothing: moves `current` toward `target`.
 * `lambda` is the response rate (higher = snappier), `dt` the frame time in seconds.
 * The same lambda feels identical at 30, 60 or 144 Hz, unlike a fixed lerp factor.
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  if (!Number.isFinite(current)) return target;
  if (!Number.isFinite(target)) return current;
  if (!(dt > 0) || !(lambda > 0)) return current;
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/** Clamp a frame delta so a backgrounded tab does not produce one giant jump. */
export function clampDt(ms: number, maxMs = 64): number {
  if (!(ms > 0)) return 0;
  return Math.min(ms, maxMs) / 1000;
}

/** True when two points are within `eps` px, so the loop can sleep instead of spinning. */
export function settled(ax: number, ay: number, bx: number, by: number, eps = 0.1): boolean {
  return Math.abs(ax - bx) < eps && Math.abs(ay - by) < eps;
}

/** Selector for elements the cursor ring reacts to. */
export const INTERACTIVE = "a, button, [role='button'], summary, label";
