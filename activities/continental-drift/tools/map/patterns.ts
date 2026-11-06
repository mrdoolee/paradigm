// Draws the evidence layers (fossil bands, glacier arrows, mountain lines)
// in assembled-board coordinates so they line up when every piece sits on its target.

export type Pt = [number, number];
export interface Patterns {
  fossil: { taxon: string; color: string; points: Pt[]; width: number; source?: string }[];
  glacier: { from: Pt; to: Pt; source?: string }[];
  mountain: { points: Pt[]; width?: number; source?: string }[];
  colors?: { glacier?: string; glacierRim?: string; mountain?: string; mountainRim?: string };
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

/** Points every `gap` pixels along a polyline, starting half a gap in. */
function peaksAlong(pts: Pt[], gap: number): Pt[] {
  const out: Pt[] = [];
  let next = gap / 2;
  let run = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    while (next <= run + len) {
      const t = (next - run) / len;
      out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
      next += gap;
    }
    run += len;
  }
  return out;
}

/** Fills a triangle (pixel centres inside it). */
export function fillTri(buf: Uint8Array, w: number, h: number, a: Pt, b: Pt, c: Pt, rgb: [number, number, number]) {
  const side = (p: Pt, q: Pt, x: number, y: number) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
  const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
  const maxX = Math.min(w - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
  const minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
  const maxY = Math.min(h - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++) {
      const d1 = side(a, b, x + 0.5, y + 0.5);
      const d2 = side(b, c, x + 0.5, y + 0.5);
      const d3 = side(c, a, x + 0.5, y + 0.5);
      if ((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)) continue;
      const k = (y * w + x) * 4;
      buf[k] = rgb[0]; buf[k + 1] = rgb[1]; buf[k + 2] = rgb[2]; buf[k + 3] = 255;
    }
}

/** Returns one RGBA layer per pattern name, each w*h*4. */
export function renderPatterns(p: Patterns, w: number, h: number): Record<string, Uint8Array> {
  const fossil = new Uint8Array(w * h * 4);
  for (const f of p.fossil) stroke(fossil, w, h, f.points, f.width, hex(f.color));

  // glacier arrows: a dark rim under a blue line, so they read on every land colour (also white Antarctica)
  const glacier = new Uint8Array(w * h * 4);
  const gc = hex(p.colors?.glacier ?? '#2f78c8');
  const rim = hex(p.colors?.glacierRim ?? '#1b2a38');
  const arrows = p.glacier.map((a) => {
    const [fx, fy] = a.from;
    const [tx, ty] = a.to;
    const len = Math.hypot(tx - fx, ty - fy) || 1;
    const ux = (tx - fx) / len;
    const uy = (ty - fy) / len;
    const head = 5;
    const left: Pt = [tx - ux * head - uy * head * 0.7, ty - uy * head + ux * head * 0.7];
    const right: Pt = [tx - ux * head + uy * head * 0.7, ty - uy * head - ux * head * 0.7];
    return [[a.from, a.to], [left, a.to, right]] as Pt[][];
  });
  for (const lines of arrows) for (const l of lines) stroke(glacier, w, h, l, 4.4, rim);
  for (const lines of arrows) for (const l of lines) stroke(glacier, w, h, l, 2.2, gc);

  // mountain belts: a dark ridge line with a row of peaks, all on a light rim,
  // so the belt stands out on every land colour and its ends are easy to line up
  const mountain = new Uint8Array(w * h * 4);
  const mc = hex(p.colors?.mountain ?? '#8a5a2b');
  const mrim = hex(p.colors?.mountainRim ?? '#f4ecd8');
  const peaks = p.mountain.flatMap((m) => peaksAlong(m.points, 7));
  for (const m of p.mountain) stroke(mountain, w, h, m.points, (m.width ?? 3) + 3, mrim);
  for (const [x, y] of peaks) fillTri(mountain, w, h, [x - 5, y + 2], [x + 5, y + 2], [x, y - 7], mrim);
  for (const m of p.mountain) stroke(mountain, w, h, m.points, m.width ?? 3, mc);
  for (const [x, y] of peaks) fillTri(mountain, w, h, [x - 3.5, y + 1], [x + 3.5, y + 1], [x, y - 5], mc);

  return { fossil, glacier, mountain };
}
