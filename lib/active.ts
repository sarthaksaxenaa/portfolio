export type Band = { id: string; top: number; bottom: number };

/**
 * Which chapter is "current": the one crossing the reading line (40% down the viewport).
 * If none crosses it (gaps between sections), the nearest one wins; ties go to the earlier one.
 * At the very bottom of the page the last one wins: a short final section (Contact) may never
 * reach the line, but scrolling all the way down means you are reading it.
 */
export function pickActive(bands: Band[], viewportHeight: number, line = 0.4, atBottom = false): string | null {
  if (bands.length === 0 || !(viewportHeight > 0)) return null;
  if (atBottom) return bands[bands.length - 1].id;
  const y = viewportHeight * line;
  let best: Band | null = null;
  let bestDist = Infinity;
  for (const b of bands) {
    if (b.top <= y && b.bottom > y) return b.id;
    const d = b.top > y ? b.top - y : y - b.bottom;
    if (d < bestDist) {
      best = b;
      bestDist = d;
    }
  }
  return best?.id ?? null;
}
