import { describe, expect, it } from "vitest";
import { acceptsPointer, clampDt, cursorMode, damp, readingPoint, settled } from "@/lib/cursor";

describe("cursorMode", () => {
  it.each([
    [{ finePointer: true, reducedMotion: false }, "full"],
    [{ finePointer: false, reducedMotion: false }, "touch"], // phones get the light too, by finger
    [{ finePointer: true, reducedMotion: true }, "off"],
    [{ finePointer: true, reducedMotion: false, motionOff: true }, "off"],
    [{ finePointer: false, reducedMotion: true, motionOff: true }, "off"],
  ] as const)("%o → %s", (env, expected) => {
    expect(cursorMode(env)).toBe(expected);
  });
});

describe("touch helpers", () => {
  it("the light rests centred on the reading line while scrolling", () => {
    expect(readingPoint(390, 844)).toEqual({ x: 195, y: 844 * 0.4 });
  });
  it("mouse mode ignores fingers (hybrid laptops); touch mode accepts everything; off accepts nothing", () => {
    expect(acceptsPointer("full", "mouse")).toBe(true);
    expect(acceptsPointer("full", "pen")).toBe(true);
    expect(acceptsPointer("full", "touch")).toBe(false);
    expect(acceptsPointer("touch", "touch")).toBe(true);
    expect(acceptsPointer("touch", "mouse")).toBe(true);
    expect(acceptsPointer("off", "mouse")).toBe(false);
  });
});

describe("damp", () => {
  it("moves toward the target without overshooting", () => {
    const v = damp(0, 100, 10, 1 / 60);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(100);
  });

  it("converges", () => {
    let v = 0;
    for (let i = 0; i < 600; i++) v = damp(v, 100, 10, 1 / 60);
    expect(v).toBeCloseTo(100, 6);
  });

  it("is frame-rate independent: 60 Hz for 1 s ≈ 144 Hz for 1 s ≈ 30 Hz for 1 s", () => {
    const run = (hz: number) => {
      let v = 0;
      for (let i = 0; i < hz; i++) v = damp(v, 100, 6, 1 / hz);
      return v;
    };
    expect(run(144)).toBeCloseTo(run(60), 6);
    expect(run(30)).toBeCloseTo(run(60), 6);
  });

  it("does nothing for zero, negative or NaN dt and lambda", () => {
    for (const dt of [0, -1, NaN]) expect(damp(5, 100, 10, dt)).toBe(5);
    for (const l of [0, -3, NaN]) expect(damp(5, 100, l, 1 / 60)).toBe(5);
  });

  it("recovers from a NaN current value instead of propagating it", () => {
    expect(damp(NaN, 42, 10, 1 / 60)).toBe(42);
  });

  it("ignores a NaN target instead of jumping to it", () => {
    expect(damp(7, NaN, 10, 1 / 60)).toBe(7);
  });

  it("never overshoots even with a huge dt", () => {
    expect(damp(0, 100, 50, 10)).toBeLessThanOrEqual(100);
  });
});

describe("clampDt", () => {
  it("converts ms to seconds", () => expect(clampDt(16)).toBeCloseTo(0.016));
  it("caps a long gap (backgrounded tab) at 64 ms", () => expect(clampDt(5000)).toBeCloseTo(0.064));
  it("returns 0 for bad input", () => {
    for (const ms of [0, -5, NaN]) expect(clampDt(ms)).toBe(0);
  });
});

describe("settled", () => {
  it("is true within epsilon and false outside it", () => {
    expect(settled(10, 10, 10.05, 9.95)).toBe(true);
    expect(settled(10, 10, 10.5, 10)).toBe(false);
  });
});
