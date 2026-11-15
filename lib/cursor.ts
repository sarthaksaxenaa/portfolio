/**
 * Pure helpers for the cursor light. Kept free of DOM access so they are unit-testable.
 */

/**
 * full:  mouse or trackpad. Light follows the pointer; a ring and dot replace the arrow.
 * touch: phones and tablets. Light follows the finger while touching, glides to the reading
 *        line while scrolling, and a tap sends a ripple. No ring (there is no cursor to replace).
 * off:   the visitor's OS asks for reduced motion.
 */
export type CursorMode = "full" | "touch" | "off";

export type Environment = {
  /** matchMedia("(pointer: fine)") — a mouse or trackpad, not a finger */
  finePointer: boolean;
  /** matchMedia("(prefers-reduced-motion: reduce)") */
  reducedMotion: boolean;
  /** Motion disabled for any other reason */
  motionOff?: boolean;
};

export function cursorMode(env: Environment): CursorMode {
  if (env.reducedMotion || env.motionOff) return "off";
  return env.finePointer ? "full" : "touch";
}

/** Where the light rests while a touch visitor scrolls: centred, on the reading line. */
export function readingPoint(width: number, height: number): { x: number; y: number } {
  return { x: width / 2, y: height * 0.4 };
}

/** Which pointer events drive the light in each mode (hybrid laptops report both kinds). */
export function acceptsPointer(mode: CursorMode, pointerType: string | undefined): boolean {
  if (mode === "off") return false;
  if (mode === "touch") return true;
  return !pointerType || pointerType === "mouse" || pointerType === "pen";
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
