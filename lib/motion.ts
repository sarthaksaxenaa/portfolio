/**
 * Motion preference: the visitor's explicit choice wins; with no choice, follow the OS
 * (prefers-reduced-motion). Storage access is wrapped because it throws in some contexts
 * (Safari private mode, blocked third-party storage, sandboxed iframes).
 */

export type MotionPref = "on" | "off";
export const MOTION_KEY = "sarthxen:motion";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function readMotionPref(storage: StorageLike | null | undefined): MotionPref | null {
  try {
    const v = storage?.getItem(MOTION_KEY);
    return v === "on" || v === "off" ? v : null;
  } catch {
    return null;
  }
}

/** Returns false when the value could not be saved; the choice still applies for this visit. */
export function writeMotionPref(storage: StorageLike | null | undefined, pref: MotionPref): boolean {
  try {
    if (!storage) return false;
    storage.setItem(MOTION_KEY, pref);
    return true;
  } catch {
    return false;
  }
}

export function motionEnabled(pref: MotionPref | null, reducedMotion: boolean): boolean {
  if (pref === "on") return true;
  if (pref === "off") return false;
  return !reducedMotion;
}

/**
 * Inline script for <head>: sets data-motion before first paint so reveal styles
 * never flash. Kept tiny and dependency-free; mirrors motionEnabled().
 */
export const motionBootScript = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  MOTION_KEY,
)});}catch(e){p=null}var r=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;var on=p==='on'?true:p==='off'?false:!r;document.documentElement.setAttribute('data-motion',on?'on':'off')})()`;
