import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CaseStudyPage, { generateMetadata, generateStaticParams } from "@/app/work/[slug]/page";
import sitemap from "@/app/sitemap";
import { caseStudies, caseStudyBySlug, nextCaseStudy } from "@/content/caseStudies";
import { chapters, navItems } from "@/content/chapters";
import { SITE_URL } from "@/lib/site";
import { CASE_STUDY_SLUGS, isCaseStudyPath } from "@/lib/caseStudySlugs";

const props = (slug: string) => ({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) }) as never;
const renderPage = async (slug: string) => render(await CaseStudyPage(props(slug)));

describe("case-study content", () => {
  it("every case study is a featured project with a chapter that points at its page", () => {
    expect(caseStudies.map((c) => c.slug)).toEqual(["rideshare", "carenexus"]);
    for (const c of caseStudies) {
      expect(c.project.slug).toBe(c.slug);
      expect(chapters.find((ch) => ch.id === c.slug)?.path).toBe(`/work/${c.slug}`);
      expect(c.lead.length).toBeGreaterThan(30);
      expect(c.demo.href).toBe("/#skills");
    }
  });

  it("the proxy's list of pages matches the case studies, and only real ones pass", () => {
    expect([...CASE_STUDY_SLUGS]).toEqual(caseStudies.map((c) => c.slug));
    expect(isCaseStudyPath("/work/rideshare")).toBe(true);
    expect(isCaseStudyPath("/work/carenexus/")).toBe(true);
    for (const p of ["/work", "/work/", "/work/skillmatrix", "/work/rideshare/extra", "/work/RideShare", "/work/..%2Frideshare"]) {
      expect(isCaseStudyPath(p)).toBe(false);
    }
  });

  it("next wraps round, and an unknown slug finds nothing", () => {
    expect(nextCaseStudy("rideshare").slug).toBe("carenexus");
    expect(nextCaseStudy("carenexus").slug).toBe("rideshare");
    expect(caseStudyBySlug("skillmatrix")).toBeUndefined();
  });
});

describe("case-study page", () => {
  it("is prerendered for exactly the case studies", () => {
    expect(generateStaticParams()).toEqual([{ slug: "rideshare" }, { slug: "carenexus" }]);
  });

  it.each(caseStudies.map((c) => c.slug))("%s: one h1, the decisions, and links back home", async (slug) => {
    const cs = caseStudyBySlug(slug)!;
    const { container } = await renderPage(slug);
    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent(cs.project.name);
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
    expect(container.querySelectorAll(`section#${slug} [data-pin-track] > li`)).toHaveLength(cs.project.decisions.length);
    expect(screen.getByText(cs.lead)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "← All work" })).toHaveAttribute("href", "/#work");
    // The menu still works from here: every section link points back at the home page.
    const nav = screen.getByRole("navigation", { name: "Sections" });
    for (const item of navItems) {
      // Contact appears twice: in the desktop list and on its own on phones.
      for (const a of within(nav).getAllByRole("link", { name: item.label })) expect(a).toHaveAttribute("href", `/${item.href}`);
    }
    const next = nextCaseStudy(slug);
    expect(screen.getByRole("link", { name: new RegExp(`Next case study\\s*${next.project.name}`, "i") })).toHaveAttribute(
      "href",
      `/work/${next.slug}`,
    );
    expect(screen.getByRole("link", { name: /See it work/ })).toHaveAttribute("href", "/#skills");
  });

  it.each(caseStudies.map((c) => c.slug))("%s: headings never skip a level", async (slug) => {
    const { container } = await renderPage(slug);
    const levels = [...container.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => Number(h.tagName[1]));
    expect(levels[0]).toBe(1);
    levels.slice(1).forEach((l, i) => expect(l - levels[i]).toBeLessThanOrEqual(1));
  });

  it("has its own title, description and canonical address", async () => {
    const meta = await generateMetadata(props("carenexus"));
    expect(meta.title).toBe("CareNexus case study · Sarthak Saxena");
    expect(String(meta.description).length).toBeGreaterThan(80);
    expect(meta.alternates?.canonical).toBe("/work/carenexus");
    expect(meta.openGraph).toMatchObject({ type: "article", url: "/work/carenexus" });
    expect(await generateMetadata(props("nope"))).toEqual({});
  });

  it("an unknown slug is a 404", async () => {
    await expect(CaseStudyPage(props("nope"))).rejects.toThrow();
  });

  it("both pages are in the sitemap", () => {
    expect(sitemap().map((e) => e.url)).toEqual([SITE_URL, `${SITE_URL}/work/rideshare`, `${SITE_URL}/work/carenexus`]);
  });
});
