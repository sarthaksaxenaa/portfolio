"use client";

import { useEffect } from "react";
import { chapters } from "@/content/chapters";
import { projects } from "@/content/projects";
import { pickActive } from "@/lib/active";
import { hexToRgbTriplet } from "@/lib/tokens";

const accentByChapter: Record<string, string> = Object.fromEntries(
  projects.map((p) => [p.slug, hexToRgbTriplet(p.accent)]),
);

/**
 * Tracks the chapter under the reading line and:
 *  - marks its nav link with aria-current="location"
 *  - sets data-chapter and --glow on <html>, so the cursor light takes the project's colour
 *    inside a case study and returns to white everywhere else
 * Runs on scroll (passive, one read per frame), independent of the motion switch:
 * knowing where you are is navigation, not animation.
 */
export function ChapterObserver() {
  useEffect(() => {
    const root = document.documentElement;
    const sections = chapters
      .map((c) => document.getElementById(c.id))
      .filter((el): el is HTMLElement => el !== null);
    let current: string | null = null;
    let raf = 0;

    const apply = (id: string | null) => {
      if (id === current) return;
      current = id;
      if (id) {
        root.setAttribute("data-chapter", id);
        window.dispatchEvent(new CustomEvent("chapterchange", { detail: id }));
      }
      const glow = id ? accentByChapter[id] : undefined;
      if (glow) root.style.setProperty("--glow", glow);
      else root.style.removeProperty("--glow");
      // A nav link may cover several sections (Projects = both case studies).
      document.querySelectorAll<HTMLAnchorElement>("nav a[data-chapters]").forEach((a) => {
        const covers = (a.dataset.chapters ?? "").split(" ");
        if (id && covers.includes(id)) a.setAttribute("aria-current", "location");
        else a.removeAttribute("aria-current");
      });
    };

    // Scrolled all the way down a page that scrolls at all.
    const atBottom = () => {
      const h = document.documentElement.scrollHeight;
      return h > window.innerHeight && window.scrollY + window.innerHeight >= h - 2;
    };

    const measure = () => {
      raf = 0;
      apply(
        pickActive(
          sections.map((s) => {
            const r = s.getBoundingClientRect();
            return { id: s.id, top: r.top, bottom: r.bottom };
          }),
          window.innerHeight,
          0.4,
          atBottom(),
        ),
      );
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      root.removeAttribute("data-chapter");
      root.style.removeProperty("--glow");
    };
  }, []);

  return null;
}
