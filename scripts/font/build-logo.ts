// Builds the list-page title logo from the Galmuri bitmap fonts (BDF, SIL OFL 1.1).
// SITE_TITLE "A: B" becomes two pixel images: A large (Galmuri14, bold, gold gradient) and B (Galmuri11 Bold, cream).
// Output: src/home/logo-main.png, src/home/logo-sub.png at 1 pixel per font dot (the page scales them by an integer).
// Usage: npm run build:logo   (run again whenever SITE_TITLE changes)
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { SITE_TITLE } from '../../src/engine/strings';

interface Glyph {
  dw: number;
  w: number;
  h: number;
  xo: number;
  yo: number;
  rows: number[];
}
interface Font {
  ascent: number;
  descent: number;
  glyphs: Map<number, Glyph>;
}

function parseBdf(path: string): Font {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  const glyphs = new Map<number, Glyph>();
  let ascent = 0;
  let descent = 0;
  let enc = -1;
  let g: Glyph | null = null;
  let inBitmap = false;
  for (const line of lines) {
    const [key, ...v] = line.trim().split(/\s+/);
    if (key === 'FONT_ASCENT') ascent = Number(v[0]);
    else if (key === 'FONT_DESCENT') descent = Number(v[0]);
    else if (key === 'ENCODING') enc = Number(v[0]);
    else if (key === 'STARTCHAR') g = { dw: 0, w: 0, h: 0, xo: 0, yo: 0, rows: [] };
    else if (key === 'DWIDTH' && g) g.dw = Number(v[0]);
    else if (key === 'BBX' && g) [g.w, g.h, g.xo, g.yo] = v.map(Number);
    else if (key === 'BITMAP') inBitmap = true;
    else if (key === 'ENDCHAR') {
      if (g) glyphs.set(enc, g);
      g = null;
      inBitmap = false;
    } else if (inBitmap && g) g.rows.push(parseInt(key, 16));
  }
  return { ascent, descent, glyphs };
}

/** A 0/1 mask of the text, one cell per font dot. */
interface Mask {
  w: number;
  h: number;
  on: Uint8Array;
}

function render(font: Font, text: string, tracking = 0): Mask {
  const chars = [...text].map((c) => {
    const g = font.glyphs.get(c.codePointAt(0)!);
    if (!g) throw new Error(`glyph missing: ${c}`);
    return g;
  });
  const w = chars.reduce((s, g) => s + g.dw + tracking, 0);
  const h = font.ascent + font.descent;
  const on = new Uint8Array(w * h);
  let pen = 0;
  for (const g of chars) {
    const bytes = Math.ceil(g.w / 8) * 8;
    g.rows.forEach((bits, r) => {
      for (let c = 0; c < g.w; c++) {
        if (!(bits & (1 << (bytes - 1 - c)))) continue;
        const x = pen + g.xo + c;
        const y = font.ascent - g.yo - g.h + r;
        if (x >= 0 && x < w && y >= 0 && y < h) on[y * w + x] = 1;
      }
    });
    pen += g.dw + tracking;
  }
  return trim(on, w, h);
}

function trim(on: Uint8Array, w: number, h: number): Mask {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (on[y * w + x]) {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
  const tw = x1 - x0 + 1;
  const th = y1 - y0 + 1;
  const out = new Uint8Array(tw * th);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) out[y * tw + x] = on[(y + y0) * w + x + x0];
  return { w: tw, h: th, on: out };
}

/** Classic bitmap bold: OR the mask with itself shifted one dot right. */
function embolden(m: Mask): Mask {
  const w = m.w + 1;
  const on = new Uint8Array(w * m.h);
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++) if (m.on[y * m.w + x]) on[y * w + x] = on[y * w + x + 1] = 1;
  return { w, h: m.h, on };
}

type RGB = [number, number, number];
const hex = (s: string): RGB => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)) as RGB;

/**
 * Paints the mask: fill colour per text row (gradient bands), a one-dot outline around it,
 * and an optional shadow one dot below-right of the outline.
 */
function paint(m: Mask, fill: (row: number) => RGB, outline: RGB, shadow: RGB | null): PNG {
  const pad = 2;
  const w = m.w + pad * 2;
  const h = m.h + pad * 2;
  const at = (x: number, y: number) => {
    const mx = x - pad;
    const my = y - pad;
    return mx >= 0 && my >= 0 && mx < m.w && my < m.h && m.on[my * m.w + mx] === 1;
  };
  const near = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy)) return true;
    return false;
  };
  const png = new PNG({ width: w, height: h });
  const set = (x: number, y: number, c: RGB) => {
    const i = (y * w + x) * 4;
    png.data[i] = c[0]; png.data[i + 1] = c[1]; png.data[i + 2] = c[2]; png.data[i + 3] = 255;
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (at(x, y)) set(x, y, fill(y - pad));
      else if (near(x, y)) set(x, y, outline);
      else if (shadow && near(x - 1, y - 1)) set(x, y, shadow);
    }
  return png;
}

const DIST = 'node_modules/galmuri/dist';
const [mainText, subText] = SITE_TITLE.includes(': ') ? SITE_TITLE.split(': ', 2) : [SITE_TITLE, ''];

const main = embolden(render(parseBdf(`${DIST}/Galmuri14.bdf`), mainText, 2));
// gold, light at the top, darker toward the bottom (the game's accent #ffd23f in the middle)
const GOLD = ['#fff6c2', '#ffe680', '#ffd23f', '#ffd23f', '#f0aa2c', '#d9862a'].map(hex);
const gold = (row: number) => GOLD[Math.min(GOLD.length - 1, Math.floor((row / main.h) * GOLD.length))];
writeFileSync('src/home/logo-main.png', PNG.sync.write(paint(main, gold, hex('#3a1f0e'), hex('#0b1018'))));
console.log(`src/home/logo-main.png: ${main.w + 4}x${main.h + 4}`);

if (subText) {
  const sub = render(parseBdf(`${DIST}/Galmuri11-Bold.bdf`), subText);
  writeFileSync('src/home/logo-sub.png', PNG.sync.write(paint(sub, () => hex('#f4ecd8'), hex('#0b1018'), null)));
  console.log(`src/home/logo-sub.png: ${sub.w + 4}x${sub.h + 4}`);
}
