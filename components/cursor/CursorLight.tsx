"use client";

import { useEffect, useRef, useState } from "react";
import { acceptsPointer, clampDt, cursorMode, damp, INTERACTIVE, readingPoint, settled, type CursorMode } from "@/lib/cursor";
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
  const rippleRef = useRef<HTMLDivElement>(null);

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
    if (mode === "off") {
      root.removeAttribute("data-cursor");
      root.removeAttribute("data-cursor-mode");
      return;
    }
    root.setAttribute("data-cursor", "on");
    root.setAttribute("data-cursor-mode", mode);
    const touch = mode === "touch";
    let touching = false;

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
      if (!acceptsPointer(mode, e.pointerType)) return;
      if (touch && e.pointerType === "touch" && !touching && e.type === "pointermove") return;
      target.x = e.clientX;
      target.y = e.clientY;
      if (!visible) {
        // First move after entering: start from here instead of sweeping in from the centre.
        glow.x = ring.x = target.x;
        glow.y = ring.y = target.y;
      }
      setVisible(true);
      // Cards inside a transformed (pinned) track cannot use the fixed-attachment light,
      // so they get local coordinates instead.
      const card = e.target instanceof Element ? e.target.closest<HTMLElement>(".is-pinned .light-card") : null;
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--lx", `${e.clientX - r.left}px`);
        card.style.setProperty("--ly", `${e.clientY - r.top}px`);
      }
      const hovering = e.target instanceof Element && e.target.closest(INTERACTIVE);
      root.toggleAttribute("data-cursor-hover", Boolean(hovering));
      wake();
    };
    const onLeave = (e: MouseEvent) => {
      if (!touch && !e.relatedTarget) setVisible(false);
    };

    // Touch: a tap sends a ripple from the finger; dragging moves the light.
    const onDown = (e: PointerEvent) => {
      if (!touch || !acceptsPointer(mode, e.pointerType)) return;
      touching = true;
      onMove(e);
      const ripple = rippleRef.current;
      if (ripple) {
        ripple.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        ripple.classList.remove("is-rippling");
        void ripple.offsetWidth; // restart the CSS animation
        ripple.classList.add("is-rippling");
      }
    };
    const onUp = () => {
      touching = false;
    };
    // Touch, not touching: the light glides to the reading line, so headings and cards light up
    // as they scroll through it.
    const onScroll = () => {
      if (!touch || touching) return;
      const p = readingPoint(window.innerWidth, window.innerHeight);
      target.x = p.x;
      target.y = p.y;
      setVisible(true);
      wake();
    };
    const onHide = () => setVisible(false);
    const onVisibility = () => document.visibilityState === "hidden" && setVisible(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseout", onLeave);
    window.addEventListener("blur", onHide);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseout", onLeave);
      window.removeEventListener("blur", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
      ["data-cursor", "data-cursor-mode", "data-cursor-visible", "data-cursor-hover"].forEach((a) => root.removeAttribute(a));
      root.style.removeProperty("--mx");
      root.style.removeProperty("--my");
    };
  }, [mode]);

  if (mode === "off") return null;

  return (
    <div aria-hidden="true" data-testid="cursor-light" data-mode={mode} className="cursor-layers">
      <div className="cursor-dots" />
      <div ref={glowRef} className="cursor-glow" />
      {mode === "full" ? (
        <>
          <div ref={ringRef} className="cursor-ring" />
          <div ref={dotRef} className="cursor-dot" />
        </>
      ) : (
        <div ref={rippleRef} className="cursor-ripple" />
      )}
    </div>
  );
}
