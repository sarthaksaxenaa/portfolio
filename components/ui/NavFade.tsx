"use client";

import { useEffect } from "react";

/** Pixels of scroll before the menu gets its dark fade; at the very top it stays clear, as in the reel. */
export const NAV_FADE_AT = 24;

export const navFaded = (scrollY: number): boolean => Number.isFinite(scrollY) && scrollY >= NAV_FADE_AT;

/**
 * A dark scrim behind the fixed menu, taller than the bar itself so text scrolling underneath fades
 * out before it reaches the links. It is shown by `html[data-scrolled]`, set here once per frame.
 */
export function NavFade() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      frame = 0;
      root.toggleAttribute("data-scrolled", navFaded(window.scrollY));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div aria-hidden="true" className="nav-fade" />;
}
