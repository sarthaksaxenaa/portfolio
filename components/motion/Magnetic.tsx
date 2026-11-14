"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { useMotion } from "./MotionProvider";

const STRENGTH = 0.35; // fraction of the pointer offset the element follows
const RADIUS = 1.6; // reach, as a multiple of the element's half-size

/** [data-magnetic] elements lean toward a nearby mouse and spring back. Fine pointers, motion on. */
export function Magnetic() {
  const { enabled } = useMotion();

  useEffect(() => {
    if (!enabled || !window.matchMedia("(pointer: fine)").matches) return;
    const els = gsap.utils.toArray<HTMLElement>("[data-magnetic]");
    const movers = els.map((el) => ({
      el,
      x: gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" }),
      y: gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" }),
      on: false,
    }));

    const onMove = (e: PointerEvent) => {
      for (const m of movers) {
        const r = m.el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const inside = Math.abs(dx) < (r.width / 2) * RADIUS && Math.abs(dy) < (r.height / 2) * RADIUS;
        if (inside) {
          m.on = true;
          m.x(dx * STRENGTH);
          m.y(dy * STRENGTH);
        } else if (m.on) {
          m.on = false;
          m.x(0);
          m.y(0);
        }
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      gsap.set(els, { clearProps: "transform" });
    };
  }, [enabled]);

  return null;
}
