/**
 * Design tokens: the single source of truth for colour.
 * app/globals.css mirrors these values as CSS variables; a unit test
 * fails the build if the two drift apart or if a text pairing loses contrast.
 */
export const color = {
  bg: "#050506",
  surface1: "#0B0B0D",
  surface2: "#111114",
  surface3: "#18181C",
  text: "#EDEDED",
  muted: "#8B8B93",
  accent: "#FFFFFF",
} as const;

export type ColorToken = keyof typeof color;

/** Hairline borders are white at low alpha; kept separate because they are not opaque. */
export const hairline = "rgba(255, 255, 255, 0.08)";

/** Text/background pairs the UI actually uses, with the minimum WCAG ratio each must meet. */
export const contrastPairs: ReadonlyArray<{
  fg: ColorToken;
  bg: ColorToken;
  min: number;
}> = [
  { fg: "text", bg: "bg", min: 7 },
  { fg: "text", bg: "surface3", min: 7 },
  { fg: "muted", bg: "bg", min: 4.5 },
  { fg: "muted", bg: "surface1", min: 4.5 },
  { fg: "muted", bg: "surface2", min: 4.5 },
  { fg: "muted", bg: "surface3", min: 4.5 },
  { fg: "accent", bg: "bg", min: 7 },
];

const HEX = /^#([0-9a-f]{6})$/i;

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance of a 6-digit hex colour. */
export function luminance(hex: string): number {
  const m = HEX.exec(hex);
  if (!m) throw new Error(`Expected a 6-digit hex colour, got "${hex}"`);
  const n = parseInt(m[1], 16);
  const r = channel((n >> 16) & 0xff);
  const g = channel((n >> 8) & 0xff);
  const b = channel(n & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours, from 1 to 21. Order does not matter. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
