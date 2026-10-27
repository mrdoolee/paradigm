// Pure bitmap helpers for building continent masks (1 = land).

export type Ring = [number, number][];

/** Even-odd scanline fill sampled at pixel centres. */
export function rasterizeRings(rings: Ring[], w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const sy = y + 0.5;
    const xs: number[] = [];
    for (const ring of rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        const [x0, y0] = ring[i];
        const [x1, y1] = ring[i + 1];
        if ((y0 <= sy && y1 > sy) || (y1 <= sy && y0 > sy)) {
          xs.push(x0 + ((sy - y0) / (y1 - y0)) * (x1 - x0));
        }
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const from = Math.max(0, Math.ceil(xs[k] - 0.5));
      const to = Math.min(w - 1, Math.floor(xs[k + 1] - 0.5));
      for (let x = from; x <= to; x++) out[y * w + x] ^= 1;
    }
  }
  return out;
}

/** Land pixels with a 4-neighbour that is sea or off the edge. */
export function outline(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)) out[y * w + x] = 1;
    }
  }
  return out;
}

/** Every other outline pixel in a checkerboard pattern. */
export function dotted(ring: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (ring[y * w + x] && (x + y) % 2 === 0) out[y * w + x] = 1;
  return out;
}

/** Fills sea pockets that cannot reach the image edge and are at most maxArea pixels (lakes between borders). */
export function fillHoles(mask: Uint8Array, w: number, h: number, maxArea: number): Uint8Array {
  const out = mask.slice();
  const seen = new Uint8Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (out[start] || seen[start]) continue;
    const stack = [start];
    const cells: number[] = [];
    let edge = false;
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      cells.push(i);
      const x = i % w;
      const y = (i - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (!out[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    if (!edge && cells.length <= maxArea) for (const i of cells) out[i] = 1;
  }
  return out;
}
