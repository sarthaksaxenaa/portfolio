import { describe, expect, it } from "vitest";
import { HALF_Y, placements } from "@/lib/scenePlacement";

describe("scene placements", () => {
  it("landscape: the sphere sits right of centre, beside the contact text, fully in view", () => {
    const { sphere } = placements(1440, 900);
    const halfX = HALF_Y * (1440 / 900);
    expect(sphere[0]).toBeGreaterThan(0);
    expect(sphere[0] + sphere[2]).toBeLessThanOrEqual(halfX * 1.05);
  });
  it("portrait phones: shapes are centred and narrower than the screen", () => {
    const { sphere, right } = placements(390, 844);
    const halfX = HALF_Y * (390 / 844);
    expect(sphere[0]).toBe(0);
    expect(right[0]).toBe(0);
    expect(sphere[2]).toBeLessThan(halfX);
  });
  it("survives a zero-size canvas (first frame) without NaN", () => {
    for (const v of Object.values(placements(0, 0)).flat()) expect(Number.isFinite(v)).toBe(true);
  });
});
