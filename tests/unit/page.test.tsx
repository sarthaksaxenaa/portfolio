import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";
import { chapters } from "@/content/chapters";
import { PUBLIC_EMAIL } from "@/content/schema";
import { provenance } from "@/components/ui/StatTile";

describe("home page", () => {
  it("renders exactly one h1 with the name", () => {
    render(<Home />);
    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent(/Sarthak\s*Saxena/);
  });

  it("has a main landmark for the skip link", () => {
    render(<Home />);
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
  });

  it.each(chapters.map((c) => c.id))("renders the %s chapter as a labelled region", (id) => {
    const { container } = render(<Home />);
    const section = container.querySelector(`section#${id}`);
    expect(section).not.toBeNull();
    const labelId = section!.getAttribute("aria-labelledby");
    expect(labelId && container.querySelector(`#${labelId}`)).toBeTruthy();
  });

  it("the intro's See the work opens the featured work, not a single case study", () => {
    const { container } = render(<Home />);
    const cta = screen.getByRole("link", { name: "See the work" });
    expect(cta).toHaveAttribute("href", "#work");
    expect(container.querySelector("#work")).not.toBeNull();
  });

  it("every nav link points at a chapter that exists", () => {
    const { container } = render(<Home />);
    const nav = screen.getByRole("navigation", { name: "Sections" });
    for (const a of within(nav).getAllByRole("link")) {
      const target = a.getAttribute("href")!;
      if (target.endsWith(".pdf")) continue; // the resume, checked on its own below
      expect(target.startsWith("#")).toBe(true);
      expect(container.querySelector(target)).not.toBeNull();
    }
    const resume = within(nav).getByRole("link", { name: /resume/i });
    expect(resume).toHaveAttribute("href", "/Sarthak_Saxena_Resume.pdf");
    expect(resume).toHaveAttribute("target", "_blank");
  });

  it("never shows internal chapter numbers or gym labels in the nav or section eyebrows", () => {
    const { container } = render(<Home />);
    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(within(nav).getAllByRole("link").map((a) => a.textContent)).toEqual([
      "Sarthak SaxenaSoftware Developer",
      "Home",
      "Experience",
      "Projects",
      "Focus",
      "Contact",
      "Contact",
      "Resume (opens in a new tab)",
    ]);
    const visibleLabels = [nav.textContent ?? "", ...[...container.querySelectorAll("header p")].map((p) => p.textContent ?? "")];
    for (const text of visibleLabels) {
      expect(text).not.toMatch(/\b0[0-6]\b/);
      expect(text).not.toMatch(/warm-up|the grind|set [12]|progressive overload|cool-down/i);
    }
  });

  it("only ever links the public email", () => {
    const { container } = render(<Home />);
    const mailtos = [...container.querySelectorAll('a[href^="mailto:"]')].map((a) => a.getAttribute("href"));
    expect(mailtos.length).toBeGreaterThan(0);
    expect(new Set(mailtos)).toEqual(new Set([`mailto:${PUBLIC_EMAIL}`]));
    expect(container.textContent).not.toContain("sarthak-private-address");
  });

  it("every stat on the page shows where it came from", () => {
    const { container } = render(<Home />);
    const tags = container.querySelectorAll("[data-kind]");
    expect(tags.length).toBeGreaterThan(0);
    tags.forEach((t) => expect(t.textContent).toMatch(/^(Measured · |Reported by |Target)/));
  });

  it("external links are https and open safely in a new tab", () => {
    const { container } = render(<Home />);
    const external = [...container.querySelectorAll('a[href^="http"]')];
    expect(external.length).toBeGreaterThanOrEqual(8); // live sites, sources, SkillMatrix, profiles
    for (const a of external) {
      expect(a.getAttribute("href")).toMatch(/^https:\/\//);
      expect(a).toHaveAttribute("target", "_blank");
      // noopener: the new page cannot reach back through window.opener (reverse tabnabbing).
      expect(a.getAttribute("rel")?.split(" ")).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
      expect(a.textContent).toContain("(opens in a new tab)");
    }
  });

  it("in-page and email links stay in the same tab", () => {
    const { container } = render(<Home />);
    container.querySelectorAll('a[href^="#"], a[href^="mailto:"]').forEach((a) => {
      expect(a).not.toHaveAttribute("target");
    });
  });

  it("decision cards carry no numbering", () => {
    const { container } = render(<Home />);
    const cards = container.querySelectorAll("section[data-accent] ol li");
    expect(cards.length).toBe(6);
    cards.forEach((li) => expect(li.textContent).not.toMatch(/^\s*0\d/));
  });
});

describe("provenance()", () => {
  it("formats the measured date in UTC regardless of the viewer's timezone", () => {
    expect(
      provenance({ kind: "measured", value: "1", label: "x", source: "CI", measuredAt: "2026-11-09" }),
    ).toBe("Measured · CI · 9 Nov 2026");
  });
  it("labels targets so they are never read as results", () => {
    expect(provenance({ kind: "target", value: "1", label: "x" })).toMatch(/not yet measured/);
  });
});
