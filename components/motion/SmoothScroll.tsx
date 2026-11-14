"use client";

import { useEffect } from "react";
import { loadGsap, loadLenis } from "@/lib/loadMotion";
import { useMotion } from "./MotionProvider";

export const NAV_OFFSET = -72;

/**
 * Lenis smooth scroll, driven by GSAP's ticker so ScrollTrigger always reads the
 * smoothed position (otherwise scroll-linked animations drift from the page).
 * Off when motion is off: the browser's native scrolling takes over.
 */
export function SmoothScroll() {
  const { enabled } = useMotion();

  useEffect(() => {
    if (!enabled) return;
    let teardown: (() => void) | undefined;
    let cancelled = false;

    Promise.all([loadLenis(), loadGsap()]).then(([Lenis, { gsap, ScrollTrigger }]) => {
      if (cancelled) return;
      const lenis = new Lenis({
        lerp: 0.1,
        anchors: { offset: NAV_OFFSET },
        // Let nested scroll areas (code blocks, overflow panels) scroll natively.
        prevent: (node) => node.closest?.("[data-lenis-prevent]") != null,
      });
      const tick = (time: number) => lenis.raf(time * 1000);

      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      teardown = () => {
        gsap.ticker.remove(tick);
        gsap.ticker.lagSmoothing(500, 33);
        lenis.destroy();
      };
    });

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [enabled]);

  return null;
}
