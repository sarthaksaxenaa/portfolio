import { describe, expect, it } from "vitest";
import { NAME, PHASES, START, TOTAL_MS, WORD, morphSlots, phaseAt, skipTarget, writeHead } from "@/lib/openingTimeline";

describe("opening timeline", () => {
  it("tells the story in order and stays short enough for a first visit", () => {
    expect(PHASES.map(([n]) => n)).toEqual(["drift", "ignite", "write", "hold", "morph", "settle", "reveal"]);
    expect(TOTAL_MS).toBeLessThanOrEqual(9000);
  });

  it("finds the phase and progress at any moment, clamping both ends", () => {
    expect(phaseAt(-50)).toEqual({ name: "drift", p: 0 });
    expect(phaseAt(START.write)).toEqual({ name: "write", p: 0 });
    expect(phaseAt(START.morph + 650).name).toBe("morph");
    expect(phaseAt(START.morph + 650).p).toBeCloseTo(0.5);
    expect(phaseAt(TOTAL_MS + 1000)).toEqual({ name: "reveal", p: 1 });
  });

  it("writes the name left to right, starting and finishing gently", () => {
    expect(writeHead(0)).toBe(0);
    expect(writeHead(1)).toBe(1);
    expect(writeHead(-1)).toBe(0);
    let prev = 0;
    for (let p = 0.05; p <= 1; p += 0.05) {
      expect(writeHead(p)).toBeGreaterThanOrEqual(prev);
      prev = writeHead(p);
    }
    expect(writeHead(0.1)).toBeLessThan(0.1); // eased in
  });

  it("flips SARTHAK into PORTFOLIO slot by slot, left to right", () => {
    const shown = (p: number) => morphSlots(p).map((s) => (s.open > 0 ? s.ch : "")).join("");
    expect(shown(0)).toBe(NAME);
    expect(shown(1)).toBe(WORD);
    const mid = morphSlots(0.5);
    expect(mid[0].ch).toBe("P"); // the first slots have flipped…
    expect(mid[8].ch).toBe(""); // …the last has not started
    for (let p = 0; p <= 1; p += 0.1) for (const s of morphSlots(p)) expect(s.open).toBeGreaterThanOrEqual(0);
    expect(morphSlots(1)).toHaveLength(9);
  });

  it("skipping jumps forward to the glide, never backwards", () => {
    expect(skipTarget(100)).toBe(START.settle);
    expect(skipTarget(START.reveal + 10)).toBe(START.reveal + 10);
  });
});
