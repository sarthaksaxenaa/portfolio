"use client";

import { useEffect } from "react";
import { focusAt } from "@/lib/sceneFocus";
import { SCENE_FOCUS_EVENT } from "@/lib/sceneEvents";

/** Tells the particle scene which demo panel ([data-scene]) is on show, once per change. */
export function SceneFocus() {
  useEffect(() => {
    const panels = [...document.querySelectorAll<HTMLElement>("[data-scene]")];
    let current: string | null = null;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const next = focusAt(
        panels.map((p) => {
          const r = p.getBoundingClientRect();
          return { id: p.dataset.scene!, top: r.top, bottom: r.bottom };
        }),
        window.innerHeight,
      );
      if (next === current) return;
      current = next;
      window.dispatchEvent(new CustomEvent(SCENE_FOCUS_EVENT, { detail: next }));
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
      if (current !== null) window.dispatchEvent(new CustomEvent(SCENE_FOCUS_EVENT, { detail: null }));
    };
  }, []);
  return null;
}
