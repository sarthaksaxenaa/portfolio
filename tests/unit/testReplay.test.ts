import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REPLAY_MS, SUITES, TOTAL_TESTS, doneAt, suiteCounts, type TestData } from "@/lib/testReplay";

const data = JSON.parse(readFileSync("public/demos/carenexus-tests.json", "utf8")) as TestData;

describe("test replay", () => {
  it("holds every test CareNexus runs in CI, by name, matching its published stats", () => {
    expect(data.tests).toHaveLength(570);
    // The sizes reserved before the list downloads must match it, or the page would jump.
    expect(data.tests).toHaveLength(TOTAL_TESTS);
    expect(data.suites).toEqual([...SUITES]);
    expect(suiteCounts(data)).toEqual([453, 72, 45]);
    expect(data.coverage).toBeCloseTo(0.9355, 4);
    expect(new Set(data.tests.map((t) => `${t[1]}|${t[2]}`)).size).toBeGreaterThan(560);
    for (const [suite, file, name] of data.tests) {
      expect([0, 1, 2]).toContain(suite);
      expect(data.files[file]).toMatch(/^(backend|frontend)\//);
      expect(name.trim().length).toBeGreaterThan(2);
    }
  });

  it("starts empty, finishes exactly, never runs backwards", () => {
    const n = data.tests.length;
    expect(doneAt(0, n)).toBe(0);
    expect(doneAt(REPLAY_MS, n)).toBe(n);
    expect(doneAt(REPLAY_MS * 3, n)).toBe(n);
    expect(doneAt(-50, n)).toBe(0);
    let last = 0;
    for (let ms = 0; ms <= REPLAY_MS; ms += 37) {
      const d = doneAt(ms, n);
      expect(d).toBeGreaterThanOrEqual(last);
      last = d;
    }
  });

  it("copes with no tests at all", () => {
    expect(doneAt(500, 0)).toBe(0);
    expect(suiteCounts({ ...data, tests: [] })).toEqual([0, 0, 0]);
  });
});
