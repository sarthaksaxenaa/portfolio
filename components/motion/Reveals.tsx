"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useMotion } from "./MotionProvider";

gsap.registerPlugin(ScrollTrigger, SplitText);

const EASE = "power4.out";

/**
 * Page-wide reveals, applied by attribute so server components stay server components:
 *  - [data-split]  headings rise line by line from behind a mask
 *  - [data-reveal] blocks fade up, batched so a row of cards staggers together
 * Everything is reverted (inline styles and split markup removed) when motion turns off.
 * Content is fully visible without JavaScript; hidden states exist only while this runs.
 */
export function Reveals() {
  const { enabled } = useMotion();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let ctx: gsap.Context | undefined;
    const splits: SplitText[] = [];

    // Split only after fonts load, or line breaks are measured with fallback metrics.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>("[data-split]").forEach((el) => {
          const split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "split-line" });
          splits.push(split);
          el.setAttribute("data-split-ready", "");
          gsap.from(split.lines, {
            yPercent: 105,
            duration: 1.1,
            ease: EASE,
            stagger: 0.08,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });

        // Manifesto lines: words fill from dim to full as you scroll through them.
        gsap.utils.toArray<HTMLElement>("[data-fill]").forEach((el) => {
          // aria "none": words stay plain text for screen readers (aria-label is not allowed on a <p>).
          const split = SplitText.create(el, { type: "words", wordsClass: "fill-word", aria: "none" });
          splits.push(split);
          gsap.fromTo(
            split.words,
            { opacity: 0.18 },
            {
              opacity: 1,
              ease: "none",
              stagger: 0.1,
              scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true },
            },
          );
        });

        ScrollTrigger.batch("[data-reveal]", {
          start: "top 90%",
          once: true,
          onEnter: (batch) =>
            ctx?.add(() =>
              gsap.fromTo(
                batch,
                { autoAlpha: 0, y: 28 },
                {
                  autoAlpha: 1,
                  y: 0,
                  duration: 0.9,
                  ease: EASE,
                  stagger: 0.07,
                  overwrite: true,
                  // A lingering transform would break the fixed-attachment card light.
                  clearProps: "transform,opacity,visibility",
                },
              ),
            ),
        });
        // Elements below the fold start hidden; ones already on screen are revealed by batch on load.
        gsap.set(
          gsap.utils.toArray<HTMLElement>("[data-reveal]").filter((el) => el.getBoundingClientRect().top > window.innerHeight),
          { autoAlpha: 0, y: 28 },
        );
        ScrollTrigger.refresh();
      });
    });

    return () => {
      cancelled = true;
      ctx?.revert();
      splits.forEach((s) => s.revert());
      document.querySelectorAll("[data-split-ready]").forEach((el) => el.removeAttribute("data-split-ready"));
    };
  }, [enabled]);

  return null;
}
