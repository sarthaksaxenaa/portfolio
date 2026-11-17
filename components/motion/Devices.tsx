"use client";

import { useEffect } from "react";
import { useMotion } from "./MotionProvider";
import { deviceTilt, shotFor } from "@/lib/devices";

/**
 * Brings the featured-work laptops to life: as each one scrolls through the screen it steps
 * through its project's shots, and it leans toward the cursor (on touch screens, with the
 * scroll). One passive scroll listener, one rAF per change.
 */
export function Devices() {
  const { enabled } = useMotion();

  useEffect(() => {
    const devices = Array.from(document.querySelectorAll<HTMLElement>("[data-device]"));
    if (!devices.length) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    let raf = 0;

    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const d of devices) {
        const r = d.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) continue;
        const progress = (vh - r.top) / (vh + r.height);
        const n = Number(d.dataset.shots) || 1;
        d.dataset.active = String(shotFor(progress, n));
        if (enabled && !fine) {
          const t = deviceTilt(0.5, Math.min(1, Math.max(0, progress)));
          d.style.setProperty("--rx", `${t.rx}deg`);
          d.style.setProperty("--ry", "0deg");
        }
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    const onMove = (e: PointerEvent) => {
      if (!enabled || e.pointerType !== "mouse") return;
      const d = (e.currentTarget as HTMLElement).closest<HTMLElement>("[data-device]")!;
      const r = d.getBoundingClientRect();
      const t = deviceTilt((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
      d.style.setProperty("--rx", `${t.rx}deg`);
      d.style.setProperty("--ry", `${t.ry}deg`);
    };
    const onLeave = (e: PointerEvent) => {
      const d = e.currentTarget as HTMLElement;
      d.style.setProperty("--rx", "0deg");
      d.style.setProperty("--ry", "0deg");
    };

    devices.forEach((d) => {
      d.addEventListener("pointermove", onMove);
      d.addEventListener("pointerleave", onLeave);
    });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(raf);
      devices.forEach((d) => {
        d.removeEventListener("pointermove", onMove);
        d.removeEventListener("pointerleave", onLeave);
      });
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [enabled]);

  return null;
}
