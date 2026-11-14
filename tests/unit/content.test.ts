import { describe, expect, it } from "vitest";
import { Chapters, Decision, Profile, Project, PUBLIC_EMAIL, Stat } from "@/content/schema";
import { chapters } from "@/content/chapters";
import { profile } from "@/content/profile";
import { carenexus, prodigy, projects, rideshare } from "@/content/projects";
import { contrastRatio, color } from "@/lib/tokens";

const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) =>
  schema.safeParse(v).success;

describe("Stat: every number names its source", () => {
  it("accepts a fully sourced measured stat", () => {
    expect(ok(Stat, { kind: "measured", value: "94%", label: "coverage", source: "CI", measuredAt: "2026-11-09" })).toBe(true);
  });
  it("rejects a measured stat without a source", () => {
    expect(ok(Stat, { kind: "measured", value: "94%", label: "coverage", measuredAt: "2026-11-09" })).toBe(false);
  });
  it("rejects a measured stat without a date", () => {
    expect(ok(Stat, { kind: "measured", value: "94%", label: "coverage", source: "CI" })).toBe(false);
  });
  it("rejects an impossible or non-ISO date", () => {
    for (const d of ["2026-13-01", "2026-02-30", "09/11/2026", "yesterday"]) {
      expect(ok(Stat, { kind: "measured", value: "1", label: "x", source: "CI", measuredAt: d })).toBe(false);
    }
  });
  it("rejects a reported stat without a source", () => {
    expect(ok(Stat, { kind: "reported", value: "40%", label: "fewer errors" })).toBe(false);
  });
  it("rejects an unknown kind (no unlabelled numbers)", () => {
    expect(ok(Stat, { kind: "claimed", value: "99.9%", label: "uptime" })).toBe(false);
    expect(ok(Stat, { value: "99.9%", label: "uptime" })).toBe(false);
  });
  it("rejects empty values", () => {
    expect(ok(Stat, { kind: "target", value: "", label: "x" })).toBe(false);
  });
});

describe("Decision: at least one road not taken", () => {
  it("rejects a decision with no rejected alternative", () => {
    expect(ok(Decision, { context: "c", chosen: "a", rejected: [], why: "w" })).toBe(false);
  });
});

describe("Profile and links", () => {
  const base = { ...profile };
  it("only allows the public professional email", () => {
    expect(ok(Profile, { ...base, email: "180917503+sarthaksaxenaa@users.noreply.github.com" })).toBe(false);
    expect(profile.email).toBe(PUBLIC_EMAIL);
  });
  it("rejects http and javascript links", () => {
    for (const href of ["http://github.com/x", "javascript:alert(1)", "github.com/x", "ftp://x.com"]) {
      expect(ok(Profile, { ...base, links: [{ label: "x", href }] })).toBe(false);
    }
  });
  it("requires meaningful alt text on the portrait", () => {
    expect(ok(Profile, { ...base, portrait: { src: "/p.webp", alt: "photo" } })).toBe(false);
  });
  it("rejects a malformed education range", () => {
    expect(ok(Profile, { ...base, education: { ...base.education, years: "2023-27" } })).toBe(false);
  });
});

describe("Projects", () => {
  it("rejects an http repo link and a bad accent", () => {
    expect(ok(Project, { ...rideshare, repoUrl: "http://github.com/x" })).toBe(false);
    expect(ok(Project, { ...rideshare, accent: "indigo" })).toBe(false);
  });
  it.each(projects.map((p) => [p.name, p.accent]))(
    "%s accent is readable on the page background (≥ 4.5:1)",
    (_, accent) => {
      expect(contrastRatio(accent, color.bg)).toBeGreaterThanOrEqual(4.5);
    },
  );
  it("never repeats the claims that cannot be backed", () => {
    const text = JSON.stringify([projects, prodigy]).toLowerCase();
    for (const banned of ["sub-millisecond", "two-phase commit", "99.9%", "dijkstra", "pci-compliant", "microservices"]) {
      expect(text, `found "${banned}"`).not.toContain(banned);
    }
  });
  it("CareNexus numbers are all measured; Prodigy numbers are all reported", () => {
    expect(carenexus.stats.every((s) => s.kind === "measured")).toBe(true);
    expect(prodigy.stats.every((s) => s.kind === "reported")).toBe(true);
  });
});

describe("Chapters", () => {
  it("are the six chapters in order", () => {
    expect(chapters.map((c) => c.index)).toEqual(["00", "01", "02", "03", "04", "05"]);
  });
  it("reject an out-of-order index", () => {
    const swapped = [...chapters];
    [swapped[1], swapped[2]] = [swapped[2], swapped[1]];
    expect(ok(Chapters, swapped)).toBe(false);
  });
  it("reject duplicates and a missing chapter", () => {
    expect(ok(Chapters, [...chapters.slice(0, 5), { ...chapters[0], index: "05" }])).toBe(false);
    expect(ok(Chapters, chapters.slice(0, 5))).toBe(false);
  });
});
