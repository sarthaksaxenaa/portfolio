/**
 * Decide how much 3D a device gets before anything heavy loads.
 * Inputs are cheap browser hints; every one of them is optional because
 * Safari and Firefox expose fewer of them than Chrome.
 */

export type Tier = "none" | "low" | "mid" | "high";

export type DeviceHints = {
  webgl: boolean;
  cores?: number; // navigator.hardwareConcurrency
  memoryGb?: number; // navigator.deviceMemory (Chrome only)
  saveData?: boolean; // navigator.connection.saveData
  coarsePointer?: boolean; // phones and tablets
  viewportWidth?: number;
};

export const PARTICLES: Record<Tier, number> = { none: 0, low: 7000, mid: 16000, high: 28000 };

/** Device pixel ratio cap per tier: retina at full DPR is the most common way to melt a GPU. */
export const DPR_CAP: Record<Tier, number> = { none: 1, low: 1, mid: 1.5, high: 2 };

export function detectTier(h: DeviceHints): Tier {
  if (!h.webgl || h.saveData) return "none";
  const cores = h.cores ?? 4;
  const mem = h.memoryGb ?? 4;
  // Phones and narrow screens: no particles. A background effect is not worth a phone's
  // battery and main thread; Lighthouse mobile measured ~800 ms of blocking time with it on.
  // Checked before the weak-hardware rule, which would otherwise hand a weak phone "low".
  if (h.coarsePointer || (h.viewportWidth ?? 1440) < 768) return "none";
  if (cores <= 2 || mem <= 2) return "low";
  if (cores >= 8 && mem >= 8) return "high";
  return "mid";
}

/** True if the browser can create a WebGL context at all. */
export function hasWebGL(doc: Pick<Document, "createElement"> = document): boolean {
  try {
    const canvas = doc.createElement("canvas") as HTMLCanvasElement;
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function readHints(): DeviceHints {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return {
    webgl: hasWebGL(),
    cores: nav.hardwareConcurrency,
    memoryGb: nav.deviceMemory,
    saveData: nav.connection?.saveData,
    coarsePointer: window.matchMedia?.("(pointer: coarse)").matches,
    viewportWidth: window.innerWidth,
  };
}
