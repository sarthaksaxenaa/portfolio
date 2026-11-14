"use client";

import { useEffect, useRef } from "react";
import { PRELOAD_KEY } from "@/lib/motion";

const MIN_MS = 900; // long enough to read as intentional
const MAX_MS = 2500; // never hold the page hostage

/**
 * First-visit intro: a counter runs to 100 while fonts load, then a shutter lifts.
 * Shown only when the boot script set data-preload="on" (motion on, first visit this session).
 * The markup is always rendered (so server and client HTML match); CSS shows it only while
 * <html data-preload> is set, and a CSS animation hides it at 3 s even if this never hydrates.
 */
export function Preloader() {
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute("data-preload") !== "on") return;
    const start = performance.now();
    let raf = 0;
    let done = false;
    let fontsReady = false;
    document.fonts?.ready.then(() => (fontsReady = true));

    const finish = () => {
      if (done) return;
      done = true;
      try {
        sessionStorage.setItem(PRELOAD_KEY, "1");
      } catch {
        /* private mode: it will simply play again next visit */
      }
      root.setAttribute("data-preload", "done");
      window.setTimeout(() => root.removeAttribute("data-preload"), 900);
    };

    let shown = 0;
    const tick = (now: number) => {
      const t = now - start;
      const ready = (fontsReady && t >= MIN_MS) || t >= MAX_MS;
      if (ready) {
        // Catch up to 100 in a few frames instead of crawling there.
        shown += Math.max(4, (100 - shown) * 0.3);
      } else {
        // Ease toward 90 and hold there while fonts load.
        shown = Math.min(90, 100 * (1 - Math.exp(-t / 450)));
      }
      const value = Math.min(100, Math.round(shown));
      if (countRef.current) countRef.current.textContent = String(value).padStart(2, "0");
      if (value >= 100) return finish();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="preloader" aria-hidden="true" data-testid="preloader">
      <span className="preloader-count font-display" ref={countRef}>
        00
      </span>
      <span className="preloader-label font-mono">Warming up</span>
    </div>
  );
}
