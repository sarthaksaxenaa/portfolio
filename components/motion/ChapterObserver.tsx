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
      if (id) root.setAttribute("data-chapter", id);
      const glow = id ? accentByChapter[id] : undefined;
      if (glow) root.style.setProperty("--glow", glow);
      else root.style.removeProperty("--glow");
      document.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Chapters"] a[href^="#"]').forEach((a) => {
        if (a.getAttribute("href") === `#${id}`) a.setAttribute("aria-current", "location");
        else a.removeAttribute("aria-current");
      });
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
