"use client";

import { useEffect } from "react";
import { damp } from "@/lib/cursor";
import {
  FIRST_WAVE_MS,
  LENS_RADIUS_EM,
  WAVE_GAP_MS,
  WAVE_MS,
  heatAt,
  tiltFor,
  waveDone,
  waveX,
} from "@/lib/forge";
import { useMotion } from "./MotionProvider";

const HEAT_UP = 16; // metal takes heat fast…
const COOL_DOWN = 4.5; // …and gives it back slowly
const TILT_RATE = 6;
const WAVE_STRENGTH = 0.8;
const WAVE_TILT = 0.35; // the wave leans the name a little, never as much as a pointer

/**
 * The heat lens on the forged name. A mouse, pen or finger near a letter makes it heavier,
 * white-hot and lifts it toward the viewer; the whole name tilts toward the pointer. With no
 * pointer near (every phone at rest), a heat wave crosses the name every few seconds, so every
 * device sees the same thing. One rAF loop, asleep whenever nothing is moving.
 */
export function NameForge() {
  const { enabled } = useMotion();

  useEffect(() => {
    if (!enabled) return;
    const root = document.querySelector<HTMLElement>("[data-forge]");
    const stage = root?.querySelector<HTMLElement>("[data-forge-stage]");
    if (!root || !stage) return;
    const letters = Array.from(root.querySelectorAll<HTMLElement>("[data-forge-ch]"));
    const lines = letters.map((el) => Number(el.dataset.line) || 0);
    const heat = letters.map(() => 0);
    const shown = letters.map(() => -1);

    let radius = 0;
    const measure = () => {
      radius = parseFloat(getComputedStyle(root).fontSize) * LENS_RADIUS_EM;
    };
    measure();

    let px = 0;
    let py = 0;
    let pointer = false;
    let visible = true;
    let tiltX = 0;
    let tiltY = 0;
    let waveStart = -1;
    let nextWave = performance.now() + FIRST_WAVE_MS;
    let raf = 0;
    let timer = 0;
    let last = 0;

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;

      // Hold the waves while the first-visit preloader covers the page.
      if (document.documentElement.getAttribute("data-preload") === "on") nextWave = now + FIRST_WAVE_MS;
      const live = visible && pointer;
      if (live) {
        waveStart = -1;
        nextWave = now + WAVE_GAP_MS;
      } else if (visible && waveStart < 0 && now >= nextWave) {
        waveStart = now;
      }
      if (waveStart >= 0 && waveDone(now - waveStart)) {
        waveStart = -1;
        nextWave = now + WAVE_GAP_MS;
      }
      const progress = waveStart >= 0 ? (now - waveStart) / WAVE_MS : -1;

      const box = stage.getBoundingClientRect();
      let busy = progress >= 0;
      letters.forEach((el, i) => {
        let target = 0;
        if (live || progress >= 0) {
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          target = live
            ? heatAt(Math.hypot(px - cx, py - cy), radius)
            : WAVE_STRENGTH * heatAt(cx - waveX(progress, lines[i], box, radius), radius);
        }
        heat[i] = damp(heat[i], target, target > heat[i] ? HEAT_UP : COOL_DOWN, dt);
        if (Math.abs(heat[i] - target) < 0.002) heat[i] = target;
        else busy = true;
        if (Math.abs(heat[i] - shown[i]) > 0.002) {
          shown[i] = heat[i];
          el.style.setProperty("--heat", heat[i].toFixed(3));
        }
      });

      let tx = 0;
      let ty = 0;
      if (live) ({ rx: tx, ry: ty } = tiltFor(px, py, box));
      else if (progress >= 0) {
        const t = tiltFor(waveX(progress, 0, box, radius), box.top + box.height / 2, box);
        tx = t.rx * WAVE_TILT;
        ty = t.ry * WAVE_TILT;
      }
      tiltX = damp(tiltX, tx, TILT_RATE, dt);
      tiltY = damp(tiltY, ty, TILT_RATE, dt);
      if (Math.abs(tiltX - tx) + Math.abs(tiltY - ty) < 0.005) {
        tiltX = tx;
        tiltY = ty;
      } else busy = true;
      stage.style.transform = tiltX || tiltY ? `rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)` : "";

      if (busy) raf = requestAnimationFrame(frame);
      else {
        last = 0;
        // Asleep until the pointer moves again or the next wave is due.
        if (visible && !live) timer = window.setTimeout(kick, Math.max(0, nextWave - performance.now()));
      }
    };

    const kick = () => {
      window.clearTimeout(timer);
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return; // fingers come through the touch events below
      px = e.clientX;
      py = e.clientY;
      pointer = true;
      kick();
    };
    const onPointerOut = (e: PointerEvent) => {
      if (e.pointerType !== "touch" && !e.relatedTarget) {
        pointer = false;
        kick();
      }
    };
    // Touch events keep firing while the page scrolls under the finger, so letters that
    // slide under it heat up too.
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      px = t.clientX;
      py = t.clientY;
      pointer = true;
      kick();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length) return;
      pointer = false;
      kick();
    };

    // A still mouse while the page scrolls: the letters move under it.
    const onScroll = () => pointer && kick();

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) nextWave = Math.max(nextWave, performance.now() + 900);
      kick();
    });
    io.observe(root);

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    kick();

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      io.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
      letters.forEach((el) => el.style.removeProperty("--heat"));
      stage.style.transform = "";
    };
  }, [enabled]);

  return null;
}
