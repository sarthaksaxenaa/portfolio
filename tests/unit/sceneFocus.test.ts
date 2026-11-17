import { describe, expect, it } from "vitest";
import { focusAt } from "@/lib/sceneFocus";
import { FOCUS_MORPH, MORPH_INDEX } from "@/lib/morphTargets";

const vh = 1000; // reading line at 450

describe("scene focus", () => {
  it("is nothing until a panel covers the reading line", () => {
    expect(focusAt([{ id: "realtime", top: 600, bottom: 1200 }], vh)).toBeNull();
    expect(focusAt([], vh)).toBeNull();
    expect(focusAt([{ id: "realtime", top: 0, bottom: 500 }], 0)).toBeNull();
  });

  it("picks the panel on show when stacked panels overlap", () => {
    const stacked = [
      { id: "realtime", top: 88, bottom: 700 }, // stuck at the top
      { id: "ai", top: 108, bottom: 720 }, // slid over it
      { id: "tested", top: 900, bottom: 1500 }, // still coming
    ];
    expect(focusAt(stacked, vh)).toBe("ai");
  });

  it("lets go once the last panel has scrolled past", () => {
    expect(focusAt([{ id: "tested", top: -700, bottom: 300 }], vh)).toBeNull();
  });

  it("gives every demo a shape of its own, different from the section's", () => {
    const shapes = Object.values(FOCUS_MORPH);
    expect(Object.keys(FOCUS_MORPH).sort()).toEqual(["ai", "realtime", "tested"]);
    expect(new Set(shapes).size).toBe(3);
    for (const s of shapes) expect(s).not.toBe(MORPH_INDEX.skills);
  });
});
