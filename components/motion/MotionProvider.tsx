"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { motionEnabled } from "@/lib/motion";

type MotionState = {
  /** Whether animation runs right now: on unless the OS asks for reduced motion. */
  enabled: boolean;
};

const MotionContext = createContext<MotionState>({ enabled: false });

const REDUCED = "(prefers-reduced-motion: reduce)";

// External store: read during render, safe for hydration (server snapshot = no motion).
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const getReduced = () => window.matchMedia(REDUCED).matches;
const serverTrue = () => true;

export function MotionProvider({ children }: { children: ReactNode }) {
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, serverTrue);
  const enabled = motionEnabled(reduced);

  useEffect(() => {
    document.documentElement.setAttribute("data-motion", enabled ? "on" : "off");
  }, [enabled]);

  const value = useMemo(() => ({ enabled }), [enabled]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export const useMotion = () => useContext(MotionContext);
