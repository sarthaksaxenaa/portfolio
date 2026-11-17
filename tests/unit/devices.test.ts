import { describe, expect, it } from "vitest";
import { MAX_TILT, deviceTilt, shotFor } from "@/lib/devices";

describe("shotFor", () => {
  it("shows the first screen as the laptop arrives and the last as it leaves", () => {
    expect(shotFor(0, 3)).toBe(0);
    expect(shotFor(0.15, 3)).toBe(0);
    expect(shotFor(0.85, 3)).toBe(2);
    expect(shotFor(1.4, 3)).toBe(2);
    expect(shotFor(-1, 3)).toBe(0);
  });

  it("steps through every screen in order, once each", () => {
    const seen: number[] = [];
    for (let p = 0; p <= 1; p += 0.01) {
      const s = shotFor(p, 4);
      if (seen.at(-1) !== s) seen.push(s);
    }
    expect(seen).toEqual([0, 1, 2, 3]);
  });

  it("has nothing to step through with one screen or none", () => {
    expect(shotFor(0.5, 1)).toBe(0);
    expect(shotFor(0.5, 0)).toBe(0);
  });
});

describe("deviceTilt", () => {
  it("is level at the centre and leans toward the pointer, never past the maximum", () => {
    expect(deviceTilt(0.5, 0.5)).toEqual({ rx: 0, ry: 0 });
    expect(deviceTilt(1, 0.5).ry).toBe(MAX_TILT);
    expect(deviceTilt(0, 0.5).ry).toBe(-MAX_TILT);
    expect(deviceTilt(0.5, 0).rx).toBeGreaterThan(0); // pointer near the top tips it back
    expect(Math.abs(deviceTilt(9, -9).ry)).toBeLessThanOrEqual(MAX_TILT);
  });
});
