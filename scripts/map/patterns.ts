// Draws the evidence layers (fossil bands, glacier arrows, mountain lines)
// in assembled-board coordinates so they line up when every piece sits on its target.

export type Pt = [number, number];
export interface Patterns {
  fossil: { taxon: string; color: string; points: Pt[]; width: number; source?: string }[];
  glacier: { from: Pt; to: Pt; source?: string }[];
  mountain: { points: Pt[]; width?: number; source?: string }[];
  colors?: { glacier?: string; mountain?: string };
  placeholder?: boolean;
}

const hex = (c: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number];

function segDist(px: number, py: number, [ax, ay]: Pt, [bx, by]: Pt): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(ax + t * dx - px, ay + t * dy - py);
}

export function stroke(buf: Uint8Array, w: number, h: number, pts: Pt[], width: number, rgb: [number, number, number]) {
  const r = width / 2;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  for (let y = Math.max(0, Math.floor(minY - r)); y <= Math.min(h - 1, Math.ceil(maxY + r)); y++) {
    for (let x = Math.max(0, Math.floor(minX - r)); x <= Math.min(w - 1, Math.ceil(maxX + r)); x++) {
      let d = Infinity;
      for (let i = 0; i + 1 < pts.length; i++) d = Math.min(d, segDist(x + 0.5, y + 0.5, pts[i], pts[i + 1]));
      if (d <= r) {
        const k = (y * w + x) * 4;
        buf[k] = rgb[0]; buf[k + 1] = rgb[1]; buf[k + 2] = rgb[2]; buf[k + 3] = 255;
      }
    }
  }
}

/** Returns one RGBA layer per pattern name, each w*h*4. */
export function renderPatterns(p: Patterns, w: number, h: number): Record<string, Uint8Array> {
  const fossil = new Uint8Array(w * h * 4);
  for (const f of p.fossil) stroke(fossil, w, h, f.points, f.width, hex(f.color));

  const glacier = new Uint8Array(w * h * 4);
  const gc = hex(p.colors?.glacier ?? '#e8f4ff');
  for (const a of p.glacier) {
    stroke(glacier, w, h, [a.from, a.to], 1.6, gc);
    const [fx, fy] = a.from;
    const [tx, ty] = a.to;
    const len = Math.hypot(tx - fx, ty - fy) || 1;
    const ux = (tx - fx) / len;
    const uy = (ty - fy) / len;
    const head = 4;
    const left: Pt = [tx - ux * head - uy * head * 0.7, ty - uy * head + ux * head * 0.7];
    const right: Pt = [tx - ux * head + uy * head * 0.7, ty - uy * head - ux * head * 0.7];
    stroke(glacier, w, h, [left, a.to, right], 1.6, gc);
  }

  const mountain = new Uint8Array(w * h * 4);
  const mc = hex(p.colors?.mountain ?? '#8a5a2b');
  for (const m of p.mountain) stroke(mountain, w, h, m.points, m.width ?? 3, mc);

  return { fossil, glacier, mountain };
}
