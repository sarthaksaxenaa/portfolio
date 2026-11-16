"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { DPR_CAP, PARTICLES, detectTier, readHints, type Tier } from "@/lib/deviceTier";
import { useMotion } from "@/components/motion/MotionProvider";
import { afterOpening, startDeferred } from "@/lib/schedule";

// three.js and the shaders only download after the page is interactive, never on the server.
// Phones start on the first touch or scroll: the hero has no particles, so nothing is missing before then.
// On a first visit, nothing starts until the opening card is gone.
const ParticleField = dynamic(() => import("./ParticleField"), { ssr: false });

/**
 * One fixed WebGL layer behind the whole page, on every device with WebGL. The particles take a
 * new shape for each section and close as a sphere beside the contact section; the hero has none.
 * The device tier sets the particle budget; only browsers without WebGL (or with Save-Data) skip it.
 */
export function SceneLayer() {
  const { enabled } = useMotion();
  const [tier, setTier] = useState<Tier | null>(null);

  useEffect(() => {
    let alive = true;
    const start = () => alive && setTier(detectTier(readHints()));
    // Behind the first-visit opening card the scene would be invisible anyway; starting it
    // there only slows the card on weak devices. Wait for the card, then the usual deferral.
    let stopDeferred = () => {};
    const stopWaiting = afterOpening(() => (stopDeferred = startDeferred(start)));
    return () => {
      alive = false;
      stopWaiting();
      stopDeferred();
    };
  }, []);

  if (!tier || tier === "none") return null;

  return (
    <div aria-hidden="true" data-testid="scene-layer" data-tier={tier} className="pointer-events-none fixed inset-0 z-0">
      <ParticleField count={PARTICLES[tier]} dpr={DPR_CAP[tier]} animate={enabled} />
    </div>
  );
}
