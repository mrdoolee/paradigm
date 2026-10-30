// Builds the sea-floor magnetic stripe pieces (grey-box art) from one list of stripe widths.
// Usage: npm run build:stripes
// The left flank plus the ridge band is one fixed piece; the right flank is cut into three pieces
// the student drags so they mirror the left flank.
import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { dotted, outline } from './raster';
import { stripePixel, type Polarity } from '../../game/minigames/stripeArt';

const OUT = 'activities/continental-drift/art/seafloor';
/** Stripe widths from the ridge outward; even index = normal polarity (like today), odd = reversed. */
export const STRIPES = [12, 7, 10, 6, 13, 9, 7, 12, 9, 10];
/** Right-flank pieces: which stripes (by index) each one holds. */
const GROUPS = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];
const RIDGE_X = 200;
const TOP = 46;
const H = 150;
const STARTS: [number, number][] = [
  [372, 70],
  [412, 52],
  [330, 60],
];
/** Textbook style: coloured = normal polarity (like today), pale = reversed. Drawn as layered crust (stripeArt.ts). */
function polarityOf(i: number): Polarity {
  return i % 2 === 0 ? 'normal' : 'reversed';
}

/** One column per entry: its polarity and its distance from the ridge axis. */
type Col = { pol: Polarity; dx: number };

function writeStrip(path: string, cols: Col[], h: number) {
  const w = cols.length;
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      const c = stripePixel(cols[x].dx, y, h, cols[x].pol);
      png.data[k] = (c >> 16) & 255;
      png.data[k + 1] = (c >> 8) & 255;
      png.data[k + 2] = c & 255;
      png.data[k + 3] = 255;
    }
  writeFileSync(path, PNG.sync.write(png));
}

function writeMask(path: string, m: Uint8Array, w: number, h: number) {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) {
    png.data.set([255, 255, 255, m[i] ? 255 : 0], i * 4);
  }
  writeFileSync(path, PNG.sync.write(png));
}

function writeOutlines(id: string, w: number, h: number) {
  const full = new Uint8Array(w * h).fill(1);
  const o = outline(full, w, h);
  writeMask(`${OUT}/${id}-outline.png`, o, w, h);
  writeMask(`${OUT}/${id}-dotted.png`, dotted(o, w, h), w, h);
}

mkdirSync(OUT, { recursive: true });
const pieces: Record<string, { w: number; h: number; start: [number, number]; target: [number, number]; fixed?: true }> = {};

// Fixed piece: left flank (outermost first) + the ridge band on both sides.
const leftX = RIDGE_X - STRIPES.slice(1).reduce((a, b) => a + b, 0) - STRIPES[0];
const left: Col[] = [];
for (let i = STRIPES.length - 1; i >= 1; i--) for (let k = 0; k < STRIPES[i]; k++) left.push({ pol: polarityOf(i), dx: leftX + left.length - RIDGE_X });
for (let k = 0; k < STRIPES[0] * 2; k++) left.push({ pol: polarityOf(0), dx: leftX + left.length - RIDGE_X });
writeStrip(`${OUT}/ridge.png`, left, H);
writeOutlines('ridge', left.length, H);
pieces.ridge = { w: left.length, h: H, start: [leftX, TOP], target: [leftX, TOP], fixed: true };

let x = RIDGE_X + STRIPES[0];
GROUPS.forEach((g, n) => {
  const cols: Col[] = [];
  for (const i of g) for (let k = 0; k < STRIPES[i]; k++) cols.push({ pol: polarityOf(i), dx: x + cols.length - RIDGE_X });
  const id = `strip-${n + 1}`;
  writeStrip(`${OUT}/${id}.png`, cols, H);
  writeOutlines(id, cols.length, H);
  pieces[id] = { w: cols.length, h: H, start: STARTS[n], target: [x, TOP] };
  x += cols.length;
});

writeFileSync(`${OUT}/seafloor.json`, JSON.stringify({ ridgeX: RIDGE_X, stripes: STRIPES, pieces }, null, 2) + '\n');
console.log(`${OUT}: ridge + ${GROUPS.length} strips`);
