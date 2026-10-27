export const VIEW_W = 480;
export const VIEW_H = 360;

/** Largest integer zoom that fits the window; never below 1. */
export function pickZoom(innerW: number, innerH: number): number {
  return Math.max(1, Math.min(Math.floor(innerW / VIEW_W), Math.floor(innerH / VIEW_H)));
}
