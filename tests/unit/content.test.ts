import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Chapters, Decision, Profile, Project, PUBLIC_EMAIL, Stat } from "@/content/schema";
import { chapters, homeChapters, navItems } from "@/content/chapters";
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
  it("serves the resume as a dated PDF from the site itself", () => {
    expect(ok(Profile, base)).toBe(true);
    expect(ok(Profile, { ...base, resume: { ...base.resume, href: "https://drive.google.com/resume" } })).toBe(false);
    expect(ok(Profile, { ...base, resume: { ...base.resume, href: "/resume.docx" } })).toBe(false);
    expect(ok(Profile, { ...base, resume: { ...base.resume, updated: "16 Nov 2026" } })).toBe(false);
  });

  it("ships the resume file it links to, small enough to open instantly", () => {
    const pdf = readFileSync(join(process.cwd(), "public", profile.resume.href.slice(1)));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.byteLength).toBeLessThan(400_000);
  });
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
    "%s accent is readable as text on the background and every card surface (≥ 4.5:1)",
    (_, accent) => {
      for (const surface of [color.bg, color.surface1, color.surface2, color.surface3]) {
        expect(contrastRatio(accent, surface)).toBeGreaterThanOrEqual(4.5);
      }
    },
  );
  it.each(projects.map((p) => [p.name, p.accent]))(
    "%s accent works as a button background behind dark text (≥ 4.5:1)",
    (_, accent) => {
      expect(contrastRatio(color.bg, accent)).toBeGreaterThanOrEqual(4.5);
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
    expect(chapters.map((c) => c.index)).toEqual(["00", "01", "02", "03", "04", "05", "06"]);
  });
  it("reject an out-of-order index", () => {
    const swapped = [...chapters];
    [swapped[1], swapped[2]] = [swapped[2], swapped[1]];
    expect(ok(Chapters, swapped)).toBe(false);
  });
  it("reject duplicates and a missing chapter", () => {
    expect(ok(Chapters, [...chapters.slice(0, 6), { ...chapters[0], index: "06" }])).toBe(false);
    expect(ok(Chapters, chapters.slice(0, 5))).toBe(false);
  });
});

describe("Featured work", () => {
  it("every screen the laptops show exists in /public/screens, with real alt text", () => {
    for (const p of [rideshare, carenexus]) {
      expect(p.shots.length).toBeGreaterThan(1);
      for (const shot of [...p.shots, ...(p.phoneShot ? [p.phoneShot] : [])]) {
        expect(existsSync(join(process.cwd(), "public", shot.src))).toBe(true);
        expect(shot.alt.length).toBeGreaterThan(12);
      }
    }
  });

  it("each card has exactly three results, a script word, and a live site", () => {
    for (const p of [rideshare, carenexus]) {
      expect(p.highlights).toHaveLength(3);
      expect(p.kicker).toBeTruthy();
      expect(p.liveUrl).toMatch(/^https:/);
    }
  });

  it("refuses screens outside /public/screens or not in WebP, and keeps them out of /work (the pages)", () => {
    const base = { ...carenexus };
    expect(ok(Project, { ...base, shots: [{ src: "/work/a.webp", alt: "a long enough alt" }] })).toBe(false);
    expect(ok(Project, { ...base, shots: [{ src: "/portrait.png", alt: "a long enough alt" }] })).toBe(false);
    expect(ok(Project, { ...base, shots: [{ src: "https://x.dev/a.webp", alt: "a long enough alt" }] })).toBe(false);
    expect(ok(Project, { ...base, highlights: ["one", "two"] })).toBe(false);
  });

  it("puts case studies after the home sections, each under /work", () => {
    const paths = chapters.map((c) => c.path ?? null);
    expect(paths).toEqual([null, null, null, null, null, "/work/rideshare", "/work/carenexus"]);
    const bad: Record<string, unknown>[] = chapters.map((c) => ({ ...c, path: undefined }));
    bad[2] = { ...bad[2], path: "/work/oops" };
    expect(ok(Chapters, bad)).toBe(false);
    expect(ok(Chapters, chapters.map((c, i) => (i === 5 ? { ...c, path: "/case/rideshare" } : c)))).toBe(false);
  });

  it("the menu lists the sections in the order they come down the page", () => {
    expect(navItems.map((n) => n.label)).toEqual(["Home", "Projects", "Experience", "Skills", "Contact"]);
    const order = homeChapters.map((c) => c.id);
    const positions = navItems.map((n) => order.indexOf(n.href.slice(1) as (typeof order)[number]));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("nav Projects opens the featured work and stays lit through both case studies", () => {
    const projects = navItems.find((n) => n.label === "Projects")!;
    expect(projects.href).toBe("#work");
    expect(projects.chapters).toEqual(["work", "rideshare", "carenexus"]);
  });
});
