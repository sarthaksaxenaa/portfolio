"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { DPR_CAP, PARTICLES, detectTier, readHints, type Tier } from "@/lib/deviceTier";
import { useMotion } from "@/components/motion/MotionProvider";

// three.js and the shader only download after the page is interactive, never on the server.
const ParticleSphere = dynamic(() => import("./ParticleSphere"), { ssr: false });

const whenIdle = (cb: () => void) => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(cb, { timeout: 1500 });
  else setTimeout(cb, 200);
};

/**
 * The particle sphere behind the hero. Decides the device tier first; weak or
 * no-WebGL devices get nothing extra (the page is already complete without it).
 * Rendering stops entirely once the hero scrolls out of view.
 */
export function HeroScene({ targetId = "warmup" }: { targetId?: string }) {
  const { enabled } = useMotion();
  const [tier, setTier] = useState<Tier | null>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    let alive = true;
    whenIdle(() => alive && setTier(detectTier(readHints())));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: "10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);

  if (!tier || tier === "none") return null;

  return (
    <div
      aria-hidden="true"
      data-testid="hero-scene"
      data-tier={tier}
      className="pointer-events-none absolute inset-y-0 right-[-10%] z-0 w-[85%] md:right-[-4%] md:w-[62%]"
    >
      <ParticleSphere count={PARTICLES[tier]} dpr={DPR_CAP[tier]} animate={enabled} active={active} />
    </div>
  );
}
