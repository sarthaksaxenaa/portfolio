/**
 * Motion follows the visitor's operating-system setting (prefers-reduced-motion) and nothing else:
 * there is no on-page switch.
 */

/** Key used by the removed on-page switch; the boot script deletes it so no old "off" lingers. */
export const LEGACY_MOTION_KEY = "sarthxen:motion";

export function motionEnabled(reducedMotion: boolean): boolean {
  return !reducedMotion;
}

/**
 * Inline script for <head>: sets data-motion before first paint so reveal styles never flash.
 * Kept tiny and dependency-free; mirrors motionEnabled().
 */
export const motionBootScript = `(function(){try{localStorage.removeItem(${JSON.stringify(
  LEGACY_MOTION_KEY,
)})}catch(e){}var r=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;document.documentElement.setAttribute('data-motion',r?'off':'on')})()`;

export const PRELOAD_KEY = "sarthxen:preloaded";

/** The opening plays once per browser session, only when motion is on. */
export function shouldPreload(motionOn: boolean, seenThisSession: boolean): boolean {
  return motionOn && !seenThisSession;
}

/**
 * Inline script for <head>, run after motionBootScript: marks <html data-preload="on">
 * so CSS shows the opening card from the very first paint. No JS = no attribute = no opening.
 * Home page only: the opening forms the hero's word, which a case-study page does not have.
 */
export const preloadBootScript = `(function(){try{var d=document.documentElement;if(d.getAttribute('data-motion')!=='on')return;if(location.pathname!=='/')return;if(sessionStorage.getItem(${JSON.stringify(
  PRELOAD_KEY,
)}))return;d.setAttribute('data-preload','on')}catch(e){}})()`;
