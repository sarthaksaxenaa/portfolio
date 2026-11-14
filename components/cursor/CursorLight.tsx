"use client";

import { useEffect, useRef, useState } from "react";
import { clampDt, cursorMode, damp, INTERACTIVE, settled, type CursorMode } from "@/lib/cursor";
import { useMotion } from "@/components/motion/MotionProvider";

const GLOW_LAMBDA = 9; // the ambient glow trails a little
const RING_LAMBDA = 22; // the ring follows tightly

function readMode(motionOff: boolean): CursorMode {
  if (typeof window === "undefined" || !window.matchMedia) return "off";
  return cursorMode({
    finePointer: window.matchMedia("(pointer: fine)").matches,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    motionOff,
  });
}

/**
 * The site's single light source. One pointer listener and one rAF loop drive:
 *  - the ambient glow and the cursor ring (moved with transforms, no layout)
 *  - --mx / --my on <html>, which CSS uses for the dot-grid reveal, card border light and text light
 * The loop stops when the light has caught up with the pointer, so an idle page costs nothing.
 */
export function CursorLight() {
  // Motion already folds in prefers-reduced-motion and the visitor's MOTION OFF switch.
  const motionOff = !useMotion().enabled;
  const [mode, setMode] = useState<CursorMode>("off");
  const glowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  // Re-evaluate when the user plugs in a mouse or changes their motion setting.
  useEffect(() => {
    const queries = ["(pointer: fine)", "(prefers-reduced-motion: reduce)"].map((q) => window.matchMedia(q));
    const update = () => setMode(readMode(motionOff));
    update();
    queries.forEach((q) => q.addEventListener("change", update));
    return () => queries.forEach((q) => q.removeEventListener("change", update));
  }, [motionOff]);

  useEffect(() => {
    const root = document.documentElement;
    if (mode !== "full") {
      root.removeAttribute("data-cursor");
      return;
    }
    root.setAttribute("data-cursor", "on");

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const glow = { ...target };
    const ring = { ...target };
    let raf = 0;
    let last = 0;
    let visible = false;

    const setVisible = (v: boolean) => {
      if (v === visible) return;
      visible = v;
      root.setAttribute("data-cursor-visible", v ? "true" : "false");
    };

    const frame = (now: number) => {
      const dt = last ? clampDt(now - last) : 1 / 60;
      last = now;
      glow.x = damp(glow.x, target.x, GLOW_LAMBDA, dt);
      glow.y = damp(glow.y, target.y, GLOW_LAMBDA, dt);
      ring.x = damp(ring.x, target.x, RING_LAMBDA, dt);
      ring.y = damp(ring.y, target.y, RING_LAMBDA, dt);

      root.style.setProperty("--mx", `${glow.x.toFixed(1)}px`);
      root.style.setProperty("--my", `${glow.y.toFixed(1)}px`);
      if (glowRef.current) glowRef.current.style.transform = `translate3d(${glow.x}px, ${glow.y}px, 0)`;
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;

      if (settled(glow.x, glow.y, target.x, target.y) && settled(ring.x, ring.y, target.x, target.y)) {
        raf = 0;
        last = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      target.x = e.clientX;
      target.y = e.clientY;
      if (!visible) {
        // First move after entering: start from here instead of sweeping in from the centre.
        glow.x = ring.x = target.x;
        glow.y = ring.y = target.y;
      }
      setVisible(true);
      const hovering = e.target instanceof Element && e.target.closest(INTERACTIVE);
      root.toggleAttribute("data-cursor-hover", Boolean(hovering));
      wake();
    };
    const onLeave = (e: MouseEvent) => {
      if (!e.relatedTarget) setVisible(false);
    };
    const onHide = () => setVisible(false);
    const onVisibility = () => document.visibilityState === "hidden" && setVisible(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseout", onLeave);
    window.addEventListener("blur", onHide);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onLeave);
      window.removeEventListener("blur", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
      ["data-cursor", "data-cursor-visible", "data-cursor-hover"].forEach((a) => root.removeAttribute(a));
      root.style.removeProperty("--mx");
      root.style.removeProperty("--my");
    };
  }, [mode]);

  if (mode !== "full") return null;

  return (
    <div aria-hidden="true" data-testid="cursor-light" className="cursor-layers">
      <div className="cursor-dots" />
      <div ref={glowRef} className="cursor-glow" />
      <div ref={ringRef} className="cursor-ring" />
      <div ref={dotRef} className="cursor-dot" />
    </div>
  );
}
