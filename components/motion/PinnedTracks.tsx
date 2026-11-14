"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotion } from "./MotionProvider";

gsap.registerPlugin(ScrollTrigger);

export const PIN_QUERY = "(min-width: 1024px) and (pointer: fine)";

/**
 * [data-pin] blocks containing a [data-pin-track] pin on large screens and turn vertical
 * scroll into a horizontal walk through the track. The wide horizontal layout is applied
 * only while the pin is live (.is-pinned), so phones, keyboards-only scrolling and MOTION OFF
 * keep the normal stacked grid and never see a half-built horizontal strip.
 */
export function PinnedTracks() {
  const { enabled } = useMotion();

  useEffect(() => {
    if (!enabled) return;
    const mm = gsap.matchMedia();

    mm.add(PIN_QUERY, () => {
      const blocks = gsap.utils.toArray<HTMLElement>("[data-pin]");
      const cleanups: Array<() => void> = [];

      blocks.forEach((block) => {
        const track = block.querySelector<HTMLElement>("[data-pin-track]");
        if (!track) return;
        block.classList.add("is-pinned");
        const distance = () => Math.max(0, track.scrollWidth - block.clientWidth);
        if (distance() === 0) {
          block.classList.remove("is-pinned");
          return;
        }
        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: block,
            start: "top 18%",
            end: () => `+=${distance()}`,
            pin: true,
            // The parent is a flex column, where GSAP defaults pinSpacing to false; without the
            // spacer, the content after the pin slides up underneath it.
            pinSpacing: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            // Pins add scroll length; measure them before the reveal triggers below them.
            refreshPriority: 1,
          },
        });
        cleanups.push(() => {
          tween.scrollTrigger?.kill(true);
          tween.kill();
          gsap.set(track, { clearProps: "transform" });
          block.classList.remove("is-pinned");
        });
      });

      ScrollTrigger.refresh();
      return () => cleanups.forEach((fn) => fn());
    });

    return () => mm.revert();
  }, [enabled]);

  return null;
}
