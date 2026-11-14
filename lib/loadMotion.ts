/**
 * GSAP, ScrollTrigger, SplitText and Lenis load on demand, after the page is interactive,
 * instead of shipping in the first JavaScript bundle. One shared promise: every motion
 * component awaits the same download, and plugins are registered exactly once.
 */
import type { gsap as GsapType } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";
import type { SplitText as SplitTextType } from "gsap/SplitText";
import type LenisType from "lenis";

export type MotionLibs = {
  gsap: typeof GsapType;
  ScrollTrigger: typeof ScrollTriggerType;
  SplitText: typeof SplitTextType;
};

let gsapPromise: Promise<MotionLibs> | null = null;
let lenisPromise: Promise<typeof LenisType> | null = null;

export function loadGsap(): Promise<MotionLibs> {
  gsapPromise ??= Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("gsap/SplitText")]).then(
    ([g, st, sp]) => {
      g.gsap.registerPlugin(st.ScrollTrigger, sp.SplitText);
      return { gsap: g.gsap, ScrollTrigger: st.ScrollTrigger, SplitText: sp.SplitText };
    },
  );
  return gsapPromise;
}

export function loadLenis(): Promise<typeof LenisType> {
  lenisPromise ??= import("lenis").then((m) => m.default);
  return lenisPromise;
}
