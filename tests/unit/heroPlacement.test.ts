import { describe, expect, it } from "vitest";
import { HALF_Y, heroPlacement } from "@/lib/heroPlacement";

const W = 1440, H = 900;
const halfX = HALF_Y * (W / H);
// Portrait as laid out on a 1440×900 desktop.
const portrait = { left: 560, top: 50, width: 880, height: 732 };
const toWorld = (px: number, py: number) => [((px / W) * 2 - 1) * halfX, -((py / H) * 2 - 1) * HALF_Y];

describe("heroPlacement", () => {
  const { sphere, keepOut } = heroPlacement(portrait, W, H, halfX);

  it("puts the sphere beside the portrait, not on the face", () => {
    const [faceX, faceY] = toWorld(portrait.left + portrait.width * 0.5, portrait.top + portrait.height * 0.38);
    expect(sphere[0]).toBeGreaterThan(faceX); // to the right of the face
    expect(sphere[1]).toBeLessThan(faceY); // below it
    expect(sphere[2]).toBeGreaterThan(0);
  });

  it("keep-out ellipse covers the face and is enabled", () => {
    const [cx, cy, rx, ry] = keepOut;
    const faceNdc = [((portrait.left + portrait.width * 0.5) / W) * 2 - 1, -(((portrait.top + portrait.height * 0.35) / H) * 2 - 1)];
    const d = Math.hypot((faceNdc[0] - cx) / rx, (faceNdc[1] - cy) / ry);
    expect(d).toBeLessThan(1);
    expect(ry).toBeGreaterThan(0);
  });

  it("disables the keep-out when there is no portrait or no viewport", () => {
    expect(heroPlacement(null, W, H, halfX).keepOut[3]).toBe(0);
    expect(heroPlacement(portrait, 0, H, halfX).keepOut[3]).toBe(0);
  });

  it("scrolls with the photo", () => {
    const later = heroPlacement({ ...portrait, top: portrait.top - 400 }, W, H, halfX);
    expect(later.sphere[1]).toBeGreaterThan(sphere[1]);
    expect(later.keepOut[1]).toBeGreaterThan(keepOut[1]);
  });
});
