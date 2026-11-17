import type { Band } from "./active";

/**
 * Which panel the background should shape itself around. Panels stack (each sticks and the next
 * slides over it), so several can cover the reading line at once: the one that arrived last, the
 * lowest top, is the one on show. Nothing covering the line means no focus.
 */
export function focusAt(bands: Band[], viewportHeight: number, line = 0.45): string | null {
  if (!(viewportHeight > 0)) return null;
  const y = viewportHeight * line;
  let best: Band | null = null;
  for (const b of bands) {
    if (b.top <= y && b.bottom > y && (!best || b.top >= best.top)) best = b;
  }
  return best?.id ?? null;
}
