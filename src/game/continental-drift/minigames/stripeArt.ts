// Pixel colour of the magnetic-stripe rock, shared by the stripe puzzle pieces (scripts/map/build-stripes.ts)
// and the survey scene's record band, so both read as the same layered ocean crust.
// Coordinates are measured from the ridge axis, so neighbouring pieces join without a seam.

export type Polarity = 'normal' | 'reversed';

/** Rock tones per polarity: [rim/dark, body, light spot, grain]. Normal = coloured (like today), reversed = pale. */
const TONES: Record<Polarity, [number, number, number, number]> = {
  normal: [0xa86a26, 0xe0a040, 0xf2c474, 0xc8873a],
  reversed: [0xbdb39a, 0xf2ecdc, 0xfffaee, 0xd9d0bc],
};
const SEDIMENT = [0xb8a27a, 0xa48e68, 0x8c7854];
const DIKE_DARK = 0.72;

/** Fixed hash noise in 0..1 (same every run). */
export function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function darken(c: number, k: number): number {
  return (Math.round(((c >> 16) & 255) * k) << 16) | (Math.round(((c >> 8) & 255) * k) << 8) | Math.round((c & 255) * k);
}

/** Sediment rows on top of the crust: none on the axis, thicker on older floor farther away. */
export function sedimentRows(dx: number): number {
  return Math.min(9, Math.max(0, Math.round((Math.abs(dx) - 6) / 12)));
}

/**
 * Colour at (dx, y) of a crust slab `h` rows tall: sediment on top (when `withSediment`),
 * pillow basalt tinted by polarity, and sheeted dikes in the bottom `dikes` rows.
 */
export function stripePixel(dx: number, y: number, h: number, pol: Polarity, withSediment = true, dikes = 14): number {
  const [rim, body, light, grain] = TONES[pol];
  const ax = dx + 1000; // keep the pattern maths on positive numbers
  const n = hash(ax, y);
  const sed = withSediment ? sedimentRows(dx) : 0;
  if (y < sed) return n < 0.12 ? SEDIMENT[2] : SEDIMENT[y % 2];
  if (y >= h - dikes) {
    const line = (ax + Math.floor(y / 7)) % 4 === 0;
    return line ? darken(rim, DIKE_DARK) : n < 0.12 ? darken(grain, DIKE_DARK) : darken(body, 0.88);
  }
  // pillow basalt: rounded blobs in staggered rows, dark rims, a light spot top-left
  const yy = y - sed;
  const row = Math.floor(yy / 7);
  const px = (ax + (row % 2 === 0 ? 0 : 6)) % 12;
  const py = yy % 7;
  const e = ((px - 5.5) / 6) ** 2 + ((py - 3) / 3.6) ** 2;
  if (e > 0.78) return rim;
  if (px >= 2 && px <= 4 && py >= 1 && py <= 2) return light;
  return n < 0.07 ? grain : body;
}
