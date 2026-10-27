import type { Pt, Rect } from './layout';

/** Returns the target when pos is within radius (inclusive), else null. */
export function trySnap(pos: Pt, target: Pt, radius: number): Pt | null {
  return Math.hypot(pos.x - target.x, pos.y - target.y) <= radius ? { x: target.x, y: target.y } : null;
}

/** Keeps the whole w*h box inside area. */
export function clampToArea(pos: Pt, size: { w: number; h: number }, area: Rect): Pt {
  return {
    x: Math.min(Math.max(pos.x, area.x), area.x + area.w - size.w),
    y: Math.min(Math.max(pos.y, area.y), area.y + area.h - size.h),
  };
}

/** n whole-pixel steps from `from` to `to`; the last step is exactly `to`. */
export function snapSteps(from: Pt, to: Pt, n: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i <= n; i++) {
    out.push({ x: Math.round(from.x + ((to.x - from.x) * i) / n), y: Math.round(from.y + ((to.y - from.y) * i) / n) });
  }
  return out;
}
