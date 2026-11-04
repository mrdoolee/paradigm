export const VIEW_W = 480;
export const VIEW_H = 360;

/**
 * Largest integer zoom that fits the window. When even 1x does not fit (a phone held sideways),
 * shrink below 1 so the whole screen still shows; pixels then come out a little uneven.
 */
export function pickZoom(innerW: number, innerH: number): number {
  const fit = Math.min(innerW / VIEW_W, innerH / VIEW_H);
  return fit < 1 ? fit : Math.floor(fit);
}
