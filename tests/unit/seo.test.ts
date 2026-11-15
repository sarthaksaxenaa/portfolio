import { describe, expect, it } from "vitest";
import { buildStructuredData, serializeJsonLd } from "@/lib/structuredData";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site";
import { profile } from "@/content/profile";
import { projects } from "@/content/projects";

type Node = Record<string, unknown> & { "@type": string; "@id"?: string };
const graph = buildStructuredData()["@graph"] as Node[];
const byType = (t: string) => graph.filter((n) => n["@type"] === t);

describe("structured data (JSON-LD)", () => {
  it("describes one Person linked to every public profile", () => {
    const [person] = byType("Person");
    expect(person.name).toBe(profile.name);
    expect(person.sameAs).toEqual(profile.links.map((l) => l.href));
    expect(String(person.url)).toBe("https://sarthxen.vercel.app");
  });

  it("credits both shipped projects to that person, with https links", () => {
    const apps = byType("SoftwareApplication");
    expect(apps.map((a) => a.name)).toEqual(projects.map((p) => p.name));
    const personId = byType("Person")[0]["@id"];
    for (const a of apps) {
      expect((a.creator as { "@id": string })["@id"]).toBe(personId);
      expect(String(a.url)).toMatch(/^https:\/\//);
    }
  });

  it("every @id reference points at a node that exists", () => {
    const ids = new Set(graph.map((n) => n["@id"]));
    const refs = JSON.stringify(graph).match(/"@id":"[^"]+"/g)!.map((r) => r.slice(7, -1));
    refs.forEach((r) => expect(ids.has(r)).toBe(true));
  });

  it("never exposes the email to scrapers through structured data", () => {
    expect(JSON.stringify(graph)).not.toContain("@gmail.com");
  });

  it("serialisation cannot break out of the <script> tag", () => {
    const out = serializeJsonLd({ x: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).x).toBe("</script><script>alert(1)</script>");
  });
});

describe("page metadata", () => {
  it("title names the person and the role within ~60 characters", () => {
    const t = SITE_TITLE;
    expect(t).toContain("Sarthak Saxena");
    expect(t).toMatch(/full-stack engineer/i);
    expect(t.length).toBeLessThanOrEqual(65);
  });
  it("description is 120–160 characters, the length search results show in full", () => {
    const d = SITE_DESCRIPTION;
    expect(d.length).toBeGreaterThanOrEqual(120);
    expect(d.length).toBeLessThanOrEqual(160);
  });
});
