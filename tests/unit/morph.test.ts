import { describe, expect, it } from "vitest";
import { CHAPTER_OPACITY, MORPH_INDEX, ROADS, body, field, grid, insideBody, roads } from "@/lib/morphTargets";
import { chapters } from "@/content/chapters";

const N = 4000;
const finite = (a: Float32Array) => a.every(Number.isFinite);
const maxAbs = (a: Float32Array) => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

describe("morph targets", () => {
  it.each([
    ["grid", grid(N)],
    ["roads", roads(N).positions],
    ["body", body(N)],
    ["field", field(N)],
  ] as const)("%s returns exactly count × 3 finite values in [-1.1, 1.1]", (_, pts) => {
    expect(pts.length).toBe(N * 3);
    expect(finite(pts)).toBe(true);
    expect(maxAbs(pts)).toBeLessThanOrEqual(1.1);
  });

  it("every generator handles zero and negative counts", () => {
    for (const f of [grid, body, field]) {
      expect(f(0).length).toBe(0);
      expect(f(-10).length).toBe(0);
    }
    expect(roads(0).positions.length).toBe(0);
  });

  it("is deterministic across calls (same shape every visit)", () => {
    expect(Array.from(body(500))).toEqual(Array.from(body(500)));
    expect(Array.from(roads(500).positions)).toEqual(Array.from(roads(500).positions));
  });

  it("body: every point is inside the silhouette and none are left at the origin", () => {
    const pts = body(N);
    let atOrigin = 0;
    for (let i = 0; i < pts.length; i += 3) {
      expect(insideBody(pts[i], pts[i + 1])).toBe(true);
      if (pts[i] === 0 && pts[i + 1] === 0 && pts[i + 2] === 0) atOrigin++;
    }
    expect(atOrigin).toBe(0);
  });

  it("silhouette: head and feet inside, empty air outside", () => {
    expect(insideBody(0, 0.78)).toBe(true);
    expect(insideBody(0.15, -0.9)).toBe(true);
    expect(insideBody(0.45, 0.8)).toBe(false);
    expect(insideBody(0, -0.5)).toBe(false); // between the legs
  });

  it("roads: every point lies on one of the road segments, with along in [0, 1]", () => {
    const { positions, along } = roads(N);
    expect(along.length).toBe(N);
    for (let i = 0; i < N; i++) {
      const [x, y] = [positions[i * 3], positions[i * 3 + 1]];
      const onSome = ROADS.some(([x1, y1, x2, y2]) => {
        const vx = x2 - x1;
        const vy = y2 - y1;
        const t = Math.max(0, Math.min(1, ((x - x1) * vx + (y - y1) * vy) / (vx * vx + vy * vy)));
        return Math.hypot(x - (x1 + vx * t), y - (y1 + vy * t)) < 0.02;
      });
      expect(onSome).toBe(true);
      expect(along[i]).toBeGreaterThanOrEqual(0);
      expect(along[i]).toBeLessThanOrEqual(1);
    }
  });

  it("every chapter has a morph index and an opacity, and text chapters stay faint", () => {
    for (const c of chapters) {
      expect(MORPH_INDEX[c.id]).toBeTypeOf("number");
      expect(CHAPTER_OPACITY[c.id]).toBeGreaterThan(0);
      if (c.id !== "warmup") expect(CHAPTER_OPACITY[c.id]).toBeLessThanOrEqual(0.3);
    }
    expect(MORPH_INDEX.warmup).toBe(0);
  });
});
