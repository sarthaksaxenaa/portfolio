"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { MOTION_KEY, motionEnabled, readMotionPref, writeMotionPref, type MotionPref } from "@/lib/motion";

type MotionState = {
  /** Whether animation runs right now (choice + OS setting resolved). */
  enabled: boolean;
  /** The visitor's explicit choice, or null if they never touched the switch. */
  pref: MotionPref | null;
  toggle: () => void;
};

const MotionContext = createContext<MotionState>({ enabled: false, pref: null, toggle: () => {} });

const REDUCED = "(prefers-reduced-motion: reduce)";

const safeStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

// External stores: read during render, safe for hydration (server snapshot = no motion).
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const getReduced = () => window.matchMedia(REDUCED).matches;

const subscribeStored = (cb: () => void) => {
  // Keeps tabs in sync: switching motion off in one tab turns it off in the others.
  const onStorage = (e: StorageEvent) => e.key === MOTION_KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
};
const getStored = () => readMotionPref(safeStorage());

const serverTrue = () => true;
const serverNull = () => null;

export function MotionProvider({ children }: { children: ReactNode }) {
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, serverTrue);
  const stored = useSyncExternalStore(subscribeStored, getStored, serverNull);
  // Holds this visit's choice when storage is blocked and cannot remember it.
  const [override, setOverride] = useState<MotionPref | null>(null);

  const pref = override ?? stored;
  const enabled = motionEnabled(pref, reduced);

  useEffect(() => {
    document.documentElement.setAttribute("data-motion", enabled ? "on" : "off");
  }, [enabled]);

  const toggle = useCallback(() => {
    const next: MotionPref = enabled ? "off" : "on";
    writeMotionPref(safeStorage(), next);
    setOverride(next);
  }, [enabled]);

  const value = useMemo(() => ({ enabled, pref, toggle }), [enabled, pref, toggle]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export const useMotion = () => useContext(MotionContext);
