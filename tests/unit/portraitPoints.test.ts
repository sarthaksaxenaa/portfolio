import { describe, expect, it } from "vitest";
import { burstProgress, luminance, samplePortrait } from "@/lib/portraitPoints";

/** A w×h RGBA image, black except a bright square from (x0, y0) to (x1, y1). */
function image(w: number, h: number, box?: [number, number, number, number], level = 255) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lit = box && x >= box[0] && x < box[2] && y >= box[1] && y < box[3];
      px[i] = px[i + 1] = px[i + 2] = lit ? level : 0;
      px[i + 3] = 255;
    }
  return px;
}

describe("luminance", () => {
  it("is 0 for black, 1 for white, and respects transparency", () => {
    const px = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 0]);
    expect(Array.from(luminance(px, 3, 1))).toEqual([0, 1, 0]);
  });
});

describe("samplePortrait", () => {
  it("puts every particle where the image is bright, never on the dark background", () => {
    const w = 40;
    const h = 20;
    const pts = samplePortrait(image(w, h, [10, 5, 20, 10]), w, h, 500);
    for (let i = 0; i < 500; i++) {
      const x = pts[i * 3];
      const y = pts[i * 3 + 1];
      // pixel box 10..20 × 5..10 in a 40×20 image, mapped to centred, aspect-correct coordinates
      expect(x).toBeGreaterThanOrEqual((10 / w - 0.5) * 2 - 1e-9);
      expect(x).toBeLessThanOrEqual((20 / w - 0.5) * 2 + 1e-9);
      expect(y).toBeLessThanOrEqual(0.5 - 5 / h + 1e-9);
      expect(y).toBeGreaterThanOrEqual(0.5 - 10 / h - 1e-9);
      expect(pts[i * 3 + 2]).toBeCloseTo(1);
    }
  });

  it("gives brighter regions more particles", () => {
    const w = 20;
    const h = 10;
    const px = image(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const v = x < 10 ? 90 : 255; // left half dim, right half bright
        const i = (y * w + x) * 4;
        px[i] = px[i + 1] = px[i + 2] = v;
      }
    const pts = samplePortrait(px, w, h, 4000);
    let right = 0;
    for (let i = 0; i < 4000; i++) if (pts[i * 3] > 0) right++;
    expect(right / 4000).toBeGreaterThan(0.7);
  });

  it("is deterministic, so the portrait looks the same on every visit", () => {
    const px = image(30, 30, [5, 5, 25, 25], 200);
    expect(samplePortrait(px, 30, 30, 200)).toEqual(samplePortrait(px, 30, 30, 200));
  });

  it("copes with a black image or nothing to draw", () => {
    expect(Array.from(samplePortrait(image(10, 10), 10, 10, 5))).toEqual(new Array(15).fill(0));
    expect(samplePortrait(image(10, 10), 0, 10, 5)).toHaveLength(15);
    expect(samplePortrait(image(10, 10), 10, 10, 0)).toHaveLength(0);
  });
});

describe("burstProgress", () => {
  it("runs 0 → 1, eased, with early seeds leaving the dot first", () => {
    expect(burstProgress(0, 0.5)).toBe(0);
    expect(burstProgress(1, 0.99)).toBe(1);
    expect(burstProgress(0.3, 0)).toBeGreaterThan(burstProgress(0.3, 0.8));
  });
});

describe("portrait source", () => {
  it("ships as a small WebP in /public, where the particles load it from", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { PORTRAIT_SRC } = await import("@/lib/portraitPoints");
    const file = readFileSync(join(process.cwd(), "public", PORTRAIT_SRC.slice(1)));
    expect(file.subarray(8, 12).toString()).toBe("WEBP");
    expect(file.byteLength).toBeLessThan(60_000);
  });
});
