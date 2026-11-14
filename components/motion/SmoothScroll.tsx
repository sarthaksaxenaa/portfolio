"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotion } from "./MotionProvider";

gsap.registerPlugin(ScrollTrigger);

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

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, [enabled]);

  return null;
}
