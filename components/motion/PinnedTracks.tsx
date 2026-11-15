"use client";

import { useEffect } from "react";
import { loadGsap } from "@/lib/loadMotion";
import { startDeferred } from "@/lib/schedule";
import { useMotion } from "./MotionProvider";

/** Every screen: phones get the same sideways walk through the decisions, driven by scroll. */
export const PIN_QUERY = "all";

const NAV_HEIGHT = 72;
let hashRealigned = false;

/**
 * A deep link (/#carenexus) is scrolled to by the browser before the pins add their scroll
 * length, so it lands short. Once the pins exist, scroll to the target again, once per page load.
 */
function realignHash() {
  if (hashRealigned) return;
  hashRealigned = true;
  const id = decodeURIComponent(window.location.hash.slice(1));
  const target = id ? document.getElementById(id) : null;
  if (!target) return;
  window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT, behavior: "instant" });
}

/**
 * [data-pin] blocks containing a [data-pin-track] pin on every screen and turn vertical
 * scroll into a horizontal walk through the track. The wide horizontal layout is applied
 * only while the pin is live (.is-pinned), so reduced motion and no-JS keep the normal
 * stacked grid and never see a half-built horizontal strip.
 */
export function PinnedTracks() {
  const { enabled } = useMotion();

  useEffect(() => {
    if (!enabled) return;
    let mm: gsap.MatchMedia | undefined;
    let cancelled = false;
    // The galleries sit well below the fold: on phones, measure and pin them after the first
    // touch or scroll so the layout work never lands on the first paint.
    const stop = startDeferred(() => loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (cancelled) return;
      mm = gsap.matchMedia();

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
        realignHash();
        return () => cleanups.forEach((fn) => fn());
      });
    }), { eager: window.location.hash.length > 1 });

    return () => {
      cancelled = true;
      stop();
      mm?.revert();
    };
  }, [enabled]);

  return null;
}
