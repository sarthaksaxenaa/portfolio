/**
 * Scheduling for work that should never compete with first paint or hydration.
 * Shared by the 3D scene and the pinned galleries.
 */

/** After the load event and the next idle period. */
export function whenIdle(cb: () => void): void {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  const idle = () => (w.requestIdleCallback ? w.requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 300));
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
}

const INTERACTIONS = ["pointerdown", "touchstart", "scroll", "keydown", "wheel"] as const;

/**
 * Runs `cb` at the next idle moment after the visitor's first touch, scroll or key press.
 * Returns a function that cancels the wait.
 */
export function onFirstInteraction(cb: () => void): () => void {
  let fired = false;
  const fire = () => {
    if (fired) return;
    fired = true;
    INTERACTIONS.forEach((t) => window.removeEventListener(t, fire));
    whenIdle(cb);
  };
  INTERACTIONS.forEach((t) => window.addEventListener(t, fire, { passive: true }));
  return () => INTERACTIONS.forEach((t) => window.removeEventListener(t, fire));
}

/** Phones and small screens: touch-first or narrower than a tablet. */
export function isPhone(): boolean {
  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
}

/**
 * Phones wait for the first interaction, desktops for the first idle moment after load.
 * `eager` skips the interaction wait (for example, a deep link that needs the layout now).
 * Returns a cancel function.
 */
export function startDeferred(cb: () => void, { eager = false }: { eager?: boolean } = {}): () => void {
  if (!eager && isPhone()) return onFirstInteraction(cb);
  let alive = true;
  whenIdle(() => alive && cb());
  return () => {
    alive = false;
  };
}
