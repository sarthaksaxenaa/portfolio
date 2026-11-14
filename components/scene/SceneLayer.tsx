"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { DPR_CAP, PARTICLES, detectTier, readHints, type Tier } from "@/lib/deviceTier";
import { useMotion } from "@/components/motion/MotionProvider";

// three.js and the shaders only download after the page is interactive, never on the server.
const ParticleField = dynamic(() => import("./ParticleField"), { ssr: false });

const whenIdle = (cb: () => void) => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(cb, { timeout: 1500 });
  else setTimeout(cb, 200);
};

/**
 * One fixed WebGL layer behind the whole page. The particles form a sphere around the
 * portrait in the hero, then morph into a new shape for each chapter. The device tier is
 * decided first; weak or no-WebGL devices get nothing extra, since the page is complete without it.
 */
export function SceneLayer() {
  const { enabled } = useMotion();
  const [tier, setTier] = useState<Tier | null>(null);

  useEffect(() => {
    let alive = true;
    whenIdle(() => alive && setTier(detectTier(readHints())));
    return () => {
      alive = false;
    };
  }, []);

  if (!tier || tier === "none") return null;

  return (
    <div aria-hidden="true" data-testid="scene-layer" data-tier={tier} className="pointer-events-none fixed inset-0 z-0">
      <ParticleField count={PARTICLES[tier]} dpr={DPR_CAP[tier]} animate={enabled} />
    </div>
  );
}
