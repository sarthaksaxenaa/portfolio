import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildTriage, durationDays, normalise, stem, type TriageData } from "@/lib/triage";

const data = JSON.parse(readFileSync("public/demos/carenexus-triage.json", "utf8")) as TriageData;
const golden = JSON.parse(readFileSync("tests/fixtures/carenexus-golden.json", "utf8")) as {
  source: string;
  cases: { q: string; level: string; redFlag: string | null; top: { id: string; score: number }[] | null }[];
};
const triage = buildTriage(data);

describe("pocket CareNexus: the same answers as the Python backend", () => {
  it("was exported from the commit the golden answers came from", () => {
    expect(data.source).toBe(golden.source);
    expect(data.conditions).toHaveLength(50);
  });

  it.each(golden.cases.map((c) => [c.q || "(empty)", c] as const))("%s", (_q, c) => {
    const r = triage(c.q);
    expect(r.level).toBe(c.level);
    expect(r.redFlag?.title ?? null).toBe(c.redFlag);
    if (c.top) {
      expect(r.matches.map((m) => m.id)).toEqual(c.top.map((t) => t.id));
      r.matches.forEach((m, i) => expect(m.score).toBeCloseTo(c.top![i].score, 3));
    }
  });
});

describe("pocket CareNexus: building blocks", () => {
  it("stems word forms together, as the Python stemmer does", () => {
    expect(["spins", "spinning", "aches", "aching", "infections", "allergies", "stuffed", "glass", "ill"].map(stem)).toEqual([
      "spin", "spin", "ach", "ach", "infection", "allergy", "stuf", "glass", "ill",
    ]);
  });

  it("normalises phone apostrophes and punctuation before matching red flags", () => {
    expect(normalise("I CAN’T  breathe!!")).toBe("i cant breathe");
    expect(triage("I can’t breathe").level).toBe("red");
  });

  it("reads how long it has lasted", () => {
    expect(durationDays("for 3 days", data)).toBe(3);
    expect(durationDays("about 2 weeks now", data)).toBe(14);
    expect(durationDays("since yesterday", data)).toBe(1);
    expect(durationDays("a few days", data)).toBe(3);
    expect(durationDays("no time given", data)).toBeNull();
  });

  it("explains each step it took, in order", () => {
    const r = triage("sore throat for 3 days");
    expect(r.steps.map((s) => s.id)).toEqual(["redflags", "retrieve", "duration", "level"]);
    expect(r.steps.find((s) => s.id === "duration")!.detail).toMatch(/3 days/);
    expect(triage("chest pain spreading to my left arm").steps.map((s) => s.id)).toEqual(["redflags", "level"]);
  });

  it("points a crisis message at people, not at a symptom list", () => {
    const r = triage("I want to die");
    expect(r.redFlag?.crisis).toBe(true);
    expect(r.matches).toEqual([]);
  });

  it("survives anything typed into it", () => {
    for (const q of ["", "   ", "😀😀", "a".repeat(5000), "((((", "<script>alert(1)</script>", "\\b(?:"]) {
      expect(() => triage(q)).not.toThrow();
    }
    expect(triage("   ").level).toBe("none");
  });
});
