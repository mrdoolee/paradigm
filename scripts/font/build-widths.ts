// Builds src/engine/script/galmuri11-widths.json from the Galmuri11 font file.
// Usage: npm run build:widths
// The table lets Node (script checker) and the browser (dialog box) wrap lines the same way.
import { readFileSync, writeFileSync } from 'node:fs';
import opentype from 'opentype.js';

const FONT = 'node_modules/galmuri/dist/Galmuri11.ttf';
const OUT = 'src/engine/script/galmuri11-widths.json';
const SIZE = 12;

const buf = readFileSync(FONT);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const cmap = font.tables.cmap.glyphIndexMap as Record<string, number>;
const entries: [number, number][] = [];
for (const [cp, gi] of Object.entries(cmap)) {
  const adv = (font.glyphs.get(gi).advanceWidth ?? 0) * SIZE / font.unitsPerEm;
  if (!Number.isInteger(adv)) throw new Error(`U+${Number(cp).toString(16)} advance ${adv} is not a whole pixel`);
  entries.push([Number(cp), adv]);
}
entries.sort((a, b) => a[0] - b[0]);
const ranges: [number, number, number][] = [];
for (const [cp, w] of entries) {
  const last = ranges[ranges.length - 1];
  if (last && last[1] === cp - 1 && last[2] === w) last[1] = cp;
  else ranges.push([cp, cp, w]);
}
writeFileSync(OUT, JSON.stringify({ font: 'Galmuri11', sizePx: SIZE, ranges }) + '\n');
console.log(`${entries.length} glyphs, ${ranges.length} ranges -> ${OUT}`);
