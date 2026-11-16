export const CAM_Z = 3.4;
export const FOV = 45;
/** Half the visible height, in world units, at z = 0 for the scene's camera. */
export const HALF_Y = Math.tan((FOV / 2) * (Math.PI / 180)) * CAM_Z;

export type Placement = [x: number, y: number, scale: number, extra: number];

/**
 * Where each shape sits on screen, in world units at z = 0. Landscape screens put the shapes
 * on the right, beside the text column; portrait phones centre them behind the text, faint.
 */
export function placements(width: number, height: number) {
  const aspect = width > 0 && height > 0 ? width / height : 16 / 9;
  const halfX = HALF_Y * aspect;
  const landscape = aspect >= 1;
  return {
    // Sphere: closes the page, in the empty space beside "Say hi".
    sphere: (landscape
      ? [halfX * 0.5, -HALF_Y * 0.05, HALF_Y * 0.62, 0]
      : [0, HALF_Y * 0.3, halfX * 0.72, 0]) as Placement,
    // Roads and body: right of the case-study text.
    right: (landscape ? [halfX * 0.66, -0.05, HALF_Y * 0.68, 0] : [0, -0.1, halfX * 0.9, 0]) as Placement,
    // Grid: the whole screen.
    full: [0, 0, halfX * 1.05, HALF_Y * 1.05] as Placement,
    // Portrait: centred above the giant word; on phones it fits the width.
    portrait: (landscape
      ? [0, HALF_Y * 0.2, HALF_Y * 2.1, 0]
      : [0, HALF_Y * 0.3, Math.min(HALF_Y * 1.4, halfX * 2), 0]) as Placement,
  };
}
