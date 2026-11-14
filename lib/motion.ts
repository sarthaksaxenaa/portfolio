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

export const PRELOAD_KEY = "sarthxen:preloaded";

/** The preloader plays once per browser session, only when motion is on. */
export function shouldPreload(motionOn: boolean, seenThisSession: boolean): boolean {
  return motionOn && !seenThisSession;
}

/**
 * Inline script for <head>, run after motionBootScript: marks <html data-preload="on">
 * so CSS shows the preloader from the very first paint. No JS = no attribute = no preloader.
 */
export const preloadBootScript = `(function(){try{var d=document.documentElement;if(d.getAttribute('data-motion')!=='on')return;if(sessionStorage.getItem(${JSON.stringify(
  PRELOAD_KEY,
)}))return;d.setAttribute('data-preload','on')}catch(e){}})()`;
