export const CAM_Z = 3.4;
export const FOV = 45;
/** Half the visible height, in world units, at z = 0 for the scene's camera. */
export const HALF_Y = Math.tan((FOV / 2) * (Math.PI / 180)) * CAM_Z;

export type Rect = { left: number; top: number; width: number; height: number };

/**
 * Hero placement, from the portrait's on-screen rectangle (so it holds at any size and scrolls
 * with the photo). The sphere sits beside the portrait, off its right shoulder and partly off
 * screen, not around the face. The keep-out ellipse covers face and shoulders: particles that
 * drift into it fade out in the shader, so the photo is never painted over.
 */
export function heroPlacement(
  rect: Rect | null,
  w: number,
  h: number,
  halfX: number,
): { sphere: [number, number, number]; keepOut: [number, number, number, number] } {
  if (!rect || w <= 0 || h <= 0) return { sphere: [halfX * 0.75, -0.2, HALF_Y * 0.6], keepOut: [0, 0, 1, 0] };
  const toNdcX = (px: number) => (px / w) * 2 - 1;
  const toNdcY = (px: number) => -((px / h) * 2 - 1);
  const cx = rect.left + rect.width * 0.92;
  const cy = rect.top + rect.height * 0.7;
  const radius = (rect.height / h) * HALF_Y * 0.95;
  return {
    sphere: [toNdcX(cx) * halfX, toNdcY(cy) * HALF_Y, radius],
    keepOut: [
      toNdcX(rect.left + rect.width * 0.5),
      toNdcY(rect.top + rect.height * 0.42),
      ((rect.width * 0.24) / w) * 2,
      ((rect.height * 0.5) / h) * 2,
    ],
  };
}

