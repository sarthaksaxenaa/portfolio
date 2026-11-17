import { describe, expect, it } from "vitest";
import { pickActive } from "@/lib/active";
import { hexToRgbTriplet } from "@/lib/tokens";

const vh = 1000; // reading line at 400px

describe("pickActive", () => {
  it("returns the band crossing the reading line", () => {
    expect(pickActive([{ id: "a", top: -500, bottom: 300 }, { id: "b", top: 300, bottom: 1400 }], vh)).toBe("b");
  });

  it("treats the bottom edge as exclusive so two touching bands never both match", () => {
    expect(pickActive([{ id: "a", top: 0, bottom: 400 }, { id: "b", top: 400, bottom: 900 }], vh)).toBe("b");
  });

  it("falls back to the nearest band in a gap, earliest on a tie", () => {
    expect(pickActive([{ id: "a", top: -200, bottom: 350 }, { id: "b", top: 500, bottom: 900 }], vh)).toBe("a");
    expect(pickActive([{ id: "a", top: -200, bottom: 350 }, { id: "b", top: 450, bottom: 900 }], vh)).toBe("a");
  });

  it("handles the page top and bottom", () => {
    const bands = [{ id: "first", top: 600, bottom: 1600 }, { id: "last", top: 1600, bottom: 2600 }];
    expect(pickActive(bands, vh)).toBe("first");
    expect(pickActive([{ id: "x", top: -3000, bottom: -100 }], vh)).toBe("x");
  });

  it("at the very bottom of the page the last section wins, even if it is too short to reach the line", () => {
    const bands = [{ id: "skills", top: -900, bottom: 700 }, { id: "contact", top: 700, bottom: 1000 }];
    expect(pickActive(bands, vh)).toBe("skills");
    expect(pickActive(bands, vh, 0.4, true)).toBe("contact");
    expect(pickActive([], vh, 0.4, true)).toBeNull();
  });

  it("returns null for no bands or a broken viewport", () => {
    expect(pickActive([], vh)).toBeNull();
    expect(pickActive([{ id: "a", top: 0, bottom: 10 }], 0)).toBeNull();
    expect(pickActive([{ id: "a", top: 0, bottom: 10 }], NaN)).toBeNull();
  });
});

describe("hexToRgbTriplet", () => {
  it("converts to a CSS rgb() triplet", () => {
    expect(hexToRgbTriplet("#6366F1")).toBe("99 102 241");
    expect(hexToRgbTriplet("#000000")).toBe("0 0 0");
    expect(hexToRgbTriplet("#ffffff")).toBe("255 255 255");
  });
  it("rejects shorthand and junk", () => {
    for (const bad of ["#fff", "6366F1", "#6366F1FF", "red"]) expect(() => hexToRgbTriplet(bad)).toThrow();
  });
});
