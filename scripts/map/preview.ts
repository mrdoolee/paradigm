// Debug preview: draws every piece at its start or target position on one 480x360 board (2x).
// Usage: tsx scripts/map/preview.ts start|target <out.png>
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const which = (process.argv[2] ?? 'start') as 'start' | 'target';
const outPath = process.argv[3] ?? 'preview.png';
const DIR = 'activities/continental-drift/art/pieces';
const pieces = JSON.parse(readFileSync(`${DIR}/pieces.json`, 'utf8')).pieces as Record<string, { start: number[]; target: number[] }>;
const layers = (process.argv[4] ?? '').split(',').filter(Boolean);
const W = 480, H = 360, Z = 2;
const out = new PNG({ width: W * Z, height: H * Z });
const put = (x: number, y: number, c: number[]) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  for (let dy = 0; dy < Z; dy++) for (let dx = 0; dx < Z; dx++) {
    const k = ((y * Z + dy) * W * Z + x * Z + dx) * 4;
    out.data[k] = c[0]; out.data[k + 1] = c[1]; out.data[k + 2] = c[2]; out.data[k + 3] = 255;
  }
};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, y < 22 || y >= 240 ? [30, 30, 40] : [40, 70, 100]);
const colors: Record<string, number[]> = { africa: [200, 170, 90], 'south-america': [120, 180, 90], india: [210, 120, 80], antarctica: [220, 220, 230], australia: [200, 110, 160], 'north-america': [110, 150, 210], greenland: [150, 210, 200], eurasia: [170, 140, 200] };
for (const [id, p] of Object.entries(pieces)) {
  const [px, py] = p[which];
  const draw = (file: string, tint?: number[]) => {
    const png = PNG.sync.read(readFileSync(file));
    for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
      const k = (y * png.width + x) * 4;
      if (png.data[k + 3]) put(px + x, py + y, tint ?? [png.data[k], png.data[k + 1], png.data[k + 2]]);
    }
  };
  draw(`${DIR}/${id}.png`, colors[id]);
  for (const l of layers) { try { draw(`${DIR}/${id}-${l}.png`); } catch { /* piece has no such layer */ } }
  draw(`${DIR}/${id}-outline.png`, colors[id].map((v) => v * 0.6));
}
writeFileSync(outPath, PNG.sync.write(out));
