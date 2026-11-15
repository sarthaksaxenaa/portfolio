import { describe, expect, it } from "vitest";
import { LINE_LAG, MAX_TILT, WAVE_MS, heatAt, tiltFor, waveDone, waveX } from "@/lib/forge";

const box = { left: 100, top: 200, width: 600, height: 300 };

describe("heatAt", () => {
  it("is full at the centre and zero at and past the radius", () => {
    expect(heatAt(0, 100)).toBe(1);
    expect(heatAt(100, 100)).toBe(0);
    expect(heatAt(250, 100)).toBe(0);
  });

  it("falls smoothly and symmetrically", () => {
    expect(heatAt(50, 100)).toBeCloseTo(0.5);
    expect(heatAt(-30, 100)).toBe(heatAt(30, 100));
    expect(heatAt(20, 100)).toBeGreaterThan(heatAt(40, 100));
  });

  it("is zero for a missing or broken radius", () => {
    expect(heatAt(0, 0)).toBe(0);
    expect(heatAt(0, NaN)).toBe(0);
    expect(heatAt(0, -5)).toBe(0);
  });
});

describe("tiltFor", () => {
  it("is level at the centre", () => {
    const t = tiltFor(400, 350, box);
    expect(t.rx).toBeCloseTo(0);
    expect(t.ry).toBeCloseTo(0);
  });

  it("turns toward the pointer and never past the maximum", () => {
    expect(tiltFor(700, 350, box).ry).toBeCloseTo(MAX_TILT);
    expect(tiltFor(5000, 350, box).ry).toBeCloseTo(MAX_TILT);
    expect(tiltFor(-5000, 350, box).ry).toBeCloseTo(-MAX_TILT);
    expect(tiltFor(400, 200, box).rx).toBeGreaterThan(0); // above: the top leans back toward you
    expect(Math.abs(tiltFor(400, -9999, box).rx)).toBeLessThanOrEqual(MAX_TILT);
  });

  it("stays level for an empty box", () => {
    expect(tiltFor(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ rx: 0, ry: 0 });
  });
});

describe("waveX", () => {
  it("enters a lens-width before the name and leaves a lens-width after it", () => {
    expect(waveX(0, 0, box, 50)).toBe(50);
    expect(waveX(1, 0, box, 50)).toBe(750);
    expect(waveX(0.5, 0, box, 50)).toBeCloseTo(400);
  });

  it("lets the second line trail the first", () => {
    expect(waveX(0.4, 1, box, 50)).toBeLessThan(waveX(0.4, 0, box, 50));
    expect(waveX(LINE_LAG, 1, box, 50)).toBe(50);
    expect(waveX(1 + LINE_LAG, 1, box, 50)).toBe(750);
  });

  it("is done only after both lines have crossed", () => {
    expect(waveDone(WAVE_MS)).toBe(false);
    expect(waveDone(WAVE_MS * (1 + LINE_LAG) + 1)).toBe(true);
  });
});
