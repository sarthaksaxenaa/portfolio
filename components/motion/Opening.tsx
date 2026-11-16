"use client";

import { useEffect } from "react";
import { PRELOAD_KEY } from "@/lib/motion";
import { SCENE_READY_EVENT } from "@/lib/sceneEvents";

const MIN_MS = 1100; // long enough to read as intentional
const MAX_MS = 3200; // never hold the page hostage, even if the 3D scene is slow or missing
const FAILSAFE_MS = 2900; // the CSS safety net hides the opening at 3 s; arriving later, skip it
const BURST_MS = 1000; // the dot flares and the black lifts

/**
 * First-visit opening: a black screen with one glowing dot that pulses while the page and the
 * particle portrait load, then bursts; the particles fly out of the centre into the portrait
 * and the giant word forms. Shown only when the boot script set data-preload="on" (motion on,
 * first visit this session); CSS hides it at 3 s if this never hydrates.
 *
 * <html data-preload>: on (boot) → loading → burst → removed.
 */
export function Opening() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute("data-preload") !== "on") return;

    const remember = () => {
      try {
        sessionStorage.setItem(PRELOAD_KEY, "1");
      } catch {
        /* private mode: it simply plays again next visit */
      }
    };
    // Hydrated after the safety net already hid it: the visitor is reading. Leave them be.
    if (performance.now() > FAILSAFE_MS) {
      remember();
      root.removeAttribute("data-preload");
      return;
    }
    root.setAttribute("data-preload", "loading");

    const start = performance.now();
    let fontsReady = false;
    let sceneReady = false;
    let burst = false;
    const timers: number[] = [];

    const go = () => {
      if (burst) return;
      burst = true;
      remember();
      root.setAttribute("data-preload", "burst");
      timers.push(
        window.setTimeout(() => {
          root.removeAttribute("data-preload");
          window.scrollTo(0, 0);
          // The scrollbar returns with the overlay gone: let scroll-linked layout re-measure.
          window.dispatchEvent(new Event("resize"));
        }, BURST_MS),
      );
    };
    const tryBurst = () => {
      if (!burst && performance.now() - start >= MIN_MS && fontsReady && sceneReady) go();
    };
    const onScene = () => {
      sceneReady = true;
      tryBurst();
    };

    document.fonts?.ready.then(() => {
      fontsReady = true;
      tryBurst();
    });
    window.addEventListener(SCENE_READY_EVENT, onScene, { once: true });
    timers.push(window.setTimeout(tryBurst, MIN_MS));
    timers.push(window.setTimeout(go, MAX_MS));

    return () => {
      window.removeEventListener(SCENE_READY_EVENT, onScene);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <div className="opening" data-testid="opening" aria-hidden="true">
      <div className="opening-halo" />
      <div className="opening-dot" data-testid="opening-dot" />
    </div>
  );
}
