// Builds the sailing grid: continents at today's positions (pieces.json "start") on the 480x360 board,
// cut into square cells. A cell is land when its centre pixel is land in any continent mask.
// Hand edits (straits, canals, harbours) live in activities/continental-drift/sail.json, not here.
// Usage: npm run build:sea   (also writes a 3x preview PNG to tools/sea-preview.png)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const PIECES = 'activities/continental-drift/art/pieces';
const OUT = 'activities/continental-drift/art/sea/sea-grid.json';
const SAIL = 'activities/continental-drift/sail.json';
const W = 480;
const H = 360;

const pieces = JSON.parse(readFileSync(`${PIECES}/pieces.json`, 'utf8')).pieces as Record<
  string,
  { w: number; h: number; start: [number, number] }
>;
const sail = JSON.parse(readFileSync(SAIL, 'utf8')) as {
  cell: number;
  ports: Record<string, { at: [number, number] }>;
  open: [number, number][];
  block: [number, number][];
};
const CELL = sail.cell;

const land = new Uint8Array(W * H);
for (const [id, p] of Object.entries(pieces)) {
  const png = PNG.sync.read(readFileSync(`${PIECES}/${id}.png`));
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++) {
      if (png.data[(y * png.width + x) * 4 + 3] < 128) continue;
      const bx = p.start[0] + x;
      const by = p.start[1] + y;
      if (bx >= 0 && by >= 0 && bx < W && by < H) land[by * W + bx] = 1;
    }
}

const cols = W / CELL;
const rows = H / CELL;
const out: string[] = [];
for (let cy = 0; cy < rows; cy++) {
  let r = '';
  for (let cx = 0; cx < cols; cx++) {
    const px = cx * CELL + CELL / 2;
    const py = cy * CELL + CELL / 2;
    r += land[py * W + px] ? '#' : '.';
  }
  out.push(r);
}
mkdirSync('activities/continental-drift/art/sea', { recursive: true });
writeFileSync(OUT, JSON.stringify({ w: cols, h: rows, cell: CELL, rows: out }, null, 1) + '\n');

// Preview: land, sea, hand edits and ports, 3x.
const S = 3;
const prev = new PNG({ width: W * S, height: H * S });
const put = (x: number, y: number, c: number[]) => {
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) prev.data.set([...c, 255], ((y * S + j) * W * S + (x * S + i)) * 4);
};
const openSet = new Set(sail.open.map(([x, y]) => `${x},${y}`));
const blockSet = new Set(sail.block.map(([x, y]) => `${x},${y}`));
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const k = `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
    let c = land[y * W + x] ? [200, 180, 120] : [39, 70, 96];
    if (out[Math.floor(y / CELL)][Math.floor(x / CELL)] === '#' && !land[y * W + x]) c = [120, 110, 80];
    if (openSet.has(k)) c = [80, 200, 220];
    if (blockSet.has(k)) c = [200, 60, 60];
    if (x % (CELL * 10) === 0 || y % (CELL * 10) === 0) c = [c[0] * 0.7, c[1] * 0.7, c[2] * 0.7].map(Math.round);
    put(x, y, c);
  }
for (const { at } of Object.values(sail.ports))
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) put(at[0] + i, at[1] + j, [255, 210, 63]);
mkdirSync('tools', { recursive: true });
writeFileSync('tools/sea-preview.png', PNG.sync.write(prev));
console.log(`${OUT}: ${cols}x${rows} cells of ${CELL}px`);
