import { describe, expect, it } from "vitest";
import { COMMIT_AT, DECODE_REST, MORSE, approach, decodeLevel, encode, glow, layoutMorse, settleTarget } from "@/lib/morse";

describe("encode", () => {
  it("writes SARTHAK in Morse, case-insensitively, dropping anything without a code", () => {
    expect(encode("Sarthak").map((l) => l.code)).toEqual(["...", ".-", ".-.", "-", "....", ".-", "-.-"]);
    expect(encode("a-1 b").map((l) => l.ch)).toEqual(["A", "B"]);
  });

  it("covers the whole alphabet with valid dots and dashes", () => {
    expect(Object.keys(MORSE)).toHaveLength(26);
    for (const c of Object.values(MORSE)) expect(c).toMatch(/^[.-]{1,4}$/);
  });
});

describe("layoutMorse", () => {
  it("draws a dot as one line and a dash as three", () => {
    const { lines } = layoutMorse("Sarthak", 1000);
    const dots = 3 + 1 + 2 + 0 + 4 + 1 + 1;
    const dashes = 0 + 1 + 1 + 1 + 0 + 1 + 2;
    expect(lines).toHaveLength(dots + dashes * 3);
    expect(lines.filter((l) => l.dash)).toHaveLength(dashes * 3);
  });

  it("keeps every line inside the margins, in order, grouped by letter", () => {
    const width = 1000;
    const { lines, letters } = layoutMorse("Sarthak", width, 0.1);
    for (const l of lines) {
      expect(l.x).toBeGreaterThan(width * 0.1 - 20);
      expect(l.x).toBeLessThan(width * 0.9 + 20);
    }
    const xs = lines.map((l) => l.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(letters.map((l) => l.x)).toEqual([...letters.map((l) => l.x)].sort((a, b) => a - b));
    expect(new Set(lines.map((l) => l.letter)).size).toBe(7);
  });

  it("scales with the card and copes with nothing to draw", () => {
    const small = layoutMorse("Sarthak", 300);
    const large = layoutMorse("Sarthak", 1200);
    expect(large.letters[6].x / 1200).toBeCloseTo(small.letters[6].x / 300, 5);
    expect(layoutMorse("", 1000).lines).toEqual([]);
    expect(layoutMorse("Sarthak", 0).lines).toEqual([]);
  });
});

describe("glow", () => {
  it("is full under the light, zero at the radius, and symmetric", () => {
    expect(glow(0, 100)).toBe(1);
    expect(glow(100, 100)).toBe(0);
    expect(glow(-40, 100)).toBe(glow(40, 100));
    expect(glow(0, 0)).toBe(0);
  });
});

describe("decodeLevel", () => {
  it("lights letters left to right as the count climbs", () => {
    expect(decodeLevel(0, 0, 7)).toBe(0);
    expect(decodeLevel(14, 0, 7)).toBeGreaterThan(0.95); // S has just flared
    expect(decodeLevel(14, 6, 7)).toBe(0);
    expect(decodeLevel(96, 6, 7)).toBe(1);
  });

  it("settles every letter to a faint rest, never back to dark", () => {
    for (let i = 0; i < 7; i++) expect(decodeLevel(116, i, 7)).toBe(DECODE_REST);
    expect(decodeLevel(1000, 0, 7)).toBe(DECODE_REST);
  });
});

describe("scrub", () => {
  it("commits past the threshold and springs back short of it", () => {
    expect(settleTarget(COMMIT_AT - 0.01)).toBe(0);
    expect(settleTarget(COMMIT_AT)).toBe(1);
  });

  it("approaches its target without overshooting, independent of frame rate", () => {
    const a = approach(0, 1, 9, 1 / 60);
    const twoHalfSteps = approach(approach(0, 1, 9, 1 / 120), 1, 9, 1 / 120);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(1);
    expect(twoHalfSteps).toBeCloseTo(a, 10);
  });
});
