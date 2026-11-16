"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { DPR_CAP, PARTICLES, detectTier, readHints, type Tier } from "@/lib/deviceTier";
import { useMotion } from "@/components/motion/MotionProvider";
import { whenIdle } from "@/lib/schedule";

// three.js and the shaders only download after the page is interactive, never on the server.
const ParticleField = dynamic(() => import("./ParticleField"), { ssr: false });

/**
 * One fixed WebGL layer behind the whole page, on every device with WebGL. In the hero the
 * particles are the portrait; they take a new shape for each section after it.
 * The device tier sets the particle budget; only browsers without WebGL (or with Save-Data) skip it.
 */
export function SceneLayer() {
  const { enabled } = useMotion();
  const [tier, setTier] = useState<Tier | null>(null);

  useEffect(() => {
    let alive = true;
    // The hero is the particle portrait, so every device starts at the first idle moment after
    // load (the opening dot pulses meanwhile, then bursts into the particles).
    whenIdle(() => {
      if (!alive) return;
      setTier(detectTier(readHints()));
    });
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
