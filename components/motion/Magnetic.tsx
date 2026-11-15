"use client";

import { useEffect } from "react";
import { loadGsap } from "@/lib/loadMotion";
import { useMotion } from "./MotionProvider";

const STRENGTH = 0.35; // fraction of the pointer offset the element follows
const RADIUS = 1.6; // reach, as a multiple of the element's half-size

/**
 * [data-magnetic] elements lean toward a nearby mouse and spring back. With a finger they follow
 * the touch while pressed and spring back on release, so phones get the same physical feel.
 */
export function Magnetic() {
  const { enabled } = useMotion();

  useEffect(() => {
    if (!enabled) return;
    let teardown: (() => void) | undefined;
    let cancelled = false;
    loadGsap().then(({ gsap }) => {
      if (cancelled) return;
      const els = gsap.utils.toArray<HTMLElement>("[data-magnetic]");
      const movers = els.map((el) => ({
        el,
        x: gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" }),
        y: gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" }),
        on: false,
      }));

      let pressed: (typeof movers)[number] | null = null;
      const onDown = (e: PointerEvent) => {
        if (e.pointerType !== "touch") return;
        const hit = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-magnetic]") : null;
        pressed = movers.find((m) => m.el === hit) ?? null;
        if (pressed) gsap.to(pressed.el, { scale: 0.94, duration: 0.15, ease: "power2.out" });
      };
      const onUp = () => {
        if (!pressed) return;
        gsap.to(pressed.el, { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" });
        pressed.x(0);
        pressed.y(0);
        pressed = null;
      };
      const onMove = (e: PointerEvent) => {
        if (e.pointerType === "touch") {
          if (!pressed) return;
          const r = pressed.el.getBoundingClientRect();
          pressed.x((e.clientX - (r.left + r.width / 2)) * STRENGTH);
          pressed.y((e.clientY - (r.top + r.height / 2)) * STRENGTH);
          return;
        }
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
      window.addEventListener("pointerdown", onDown, { passive: true });
      window.addEventListener("pointerup", onUp, { passive: true });
      window.addEventListener("pointercancel", onUp, { passive: true });
      teardown = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        gsap.set(els, { clearProps: "transform,scale" });
      };
    });
    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [enabled]);

  return null;
}
