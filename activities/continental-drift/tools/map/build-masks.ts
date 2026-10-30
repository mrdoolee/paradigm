// Builds continent mask PNGs from Natural Earth coastlines.
// Usage: npm run build:masks
// Output (activities/continental-drift/art/pieces/):
//   <id>.png (white land), <id>-outline.png, <id>-dotted.png,
//   <id>-<pattern>.png (evidence layers cut to each piece), pieces.json.
// Existing "target" values in pieces.json are kept: they are tuned by hand.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { geoAzimuthalEqualArea, geoCentroid, geoPath, type GeoProjection } from 'd3-geo';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { PNG } from 'pngjs';
import { GROUPS, type Box } from './groups';
import { dotted, fillHoles, outline, rasterizeRings, type Ring } from './raster';
import { renderPatterns, type Patterns } from './patterns';

const SRC_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_admin_0_countries.geojson';
const SRC = 'work/data/ne_110m_admin_0_countries.geojson';
export const PIECES_DIR = 'activities/continental-drift/art/pieces';
const PIECES_JSON = `${PIECES_DIR}/pieces.json`;
const PATTERNS_JSON = 'activities/continental-drift/patterns.json';
const PX_PER_DEG = 1.1;
const AREA = { x: 0, y: 22, w: 480, h: 218 };
const BOARD = { w: 480, h: 360 };
const MIN_POLY_AREA = 6;

export interface PieceInfo {
  w: number;
  h: number;
  start: [number, number];
  target: [number, number];
  fixed?: true;
}
export interface PiecesFile {
  pxPerDeg: number;
  pieces: Record<string, PieceInfo>;
}

async function loadSource(): Promise<FeatureCollection> {
  if (!existsSync(SRC)) {
    mkdirSync('work/data', { recursive: true });
    const res = await fetch(SRC_URL);
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    writeFileSync(SRC, Buffer.from(await res.arrayBuffer()));
  }
  return JSON.parse(readFileSync(SRC, 'utf8'));
}

const inBox = ([lon, lat]: [number, number], boxes: Box[]) =>
  boxes.some(([a, b, c, d]) => lon >= a && lon <= c && lat >= b && lat <= d);

function polygonsOf(f: Feature): number[][][][] {
  const g = f.geometry as Polygon | MultiPolygon;
  return g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
}

function ringArea(r: Ring): number {
  let a = 0;
  for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
  return Math.abs(a / 2);
}

/** Collects projected rings from d3's path-context calls. */
function projectRings(geom: MultiPolygon, projection: GeoProjection): Ring[] {
  const rings: Ring[] = [];
  let cur: Ring | null = null;
  const ctx = {
    moveTo(x: number, y: number) {
      cur = [[x, y]];
      rings.push(cur);
    },
    lineTo(x: number, y: number) {
      cur?.push([x, y]);
    },
    closePath() {
      if (cur && cur.length) cur.push([cur[0][0], cur[0][1]]);
      cur = null;
    },
    arc() {},
    rect() {},
  };
  geoPath(projection, ctx as never)(geom);
  return rings.filter((r) => r.length > 3);
}

export function writeMask(path: string, m: Uint8Array, w: number, h: number) {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) {
    png.data[i * 4] = 255;
    png.data[i * 4 + 1] = 255;
    png.data[i * 4 + 2] = 255;
    png.data[i * 4 + 3] = m[i] ? 255 : 0;
  }
  writeFileSync(path, PNG.sync.write(png));
}

function writeRgba(path: string, data: Uint8Array, w: number, h: number) {
  const png = new PNG({ width: w, height: h });
  png.data.set(data);
  writeFileSync(path, PNG.sync.write(png));
}

async function main() {
  const src = await loadSource();
  mkdirSync(PIECES_DIR, { recursive: true });
  const prev: PiecesFile | null = existsSync(PIECES_JSON) ? JSON.parse(readFileSync(PIECES_JSON, 'utf8')) : null;
  const out: PiecesFile = { pxPerDeg: PX_PER_DEG, pieces: {} };
  const masks: Record<string, { m: Uint8Array; w: number; h: number }> = {};

  for (const g of GROUPS) {
    const polys: number[][][][] = [];
    for (const f of src.features) {
      if (!g.pick(f.properties as { CONTINENT: string; ADMIN: string })) continue;
      for (const p of polygonsOf(f)) {
        const c = geoCentroid({ type: 'Polygon', coordinates: p }) as [number, number];
        if (inBox(c, g.boxes)) polys.push(p);
      }
    }
    const [lc, pc] = geoCentroid({ type: 'MultiPolygon', coordinates: polys }) as [number, number];
    const projection = geoAzimuthalEqualArea()
      .rotate([-lc, -pc])
      .scale((PX_PER_DEG * 180) / Math.PI)
      .translate([0, 0]);
    const kept = polys.filter((p) => {
      const rs = projectRings({ type: 'MultiPolygon', coordinates: [p] }, projection);
      return rs.reduce((s, r) => s + ringArea(r), 0) >= MIN_POLY_AREA;
    });
    const rings = projectRings({ type: 'MultiPolygon', coordinates: kept }, projection);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of rings)
      for (const [x, y] of r) {
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    const ox = Math.floor(minX);
    const oy = Math.floor(minY);
    const w = Math.ceil(maxX) - ox + 1;
    const h = Math.ceil(maxY) - oy + 1;
    const shifted = rings.map((r) => r.map(([x, y]) => [x - ox, y - oy] as [number, number]));
    const m = fillHoles(rasterizeRings(shifted, w, h), w, h, 40);
    const o = outline(m, w, h);
    writeMask(`${PIECES_DIR}/${g.id}.png`, m, w, h);
    writeMask(`${PIECES_DIR}/${g.id}-outline.png`, o, w, h);
    writeMask(`${PIECES_DIR}/${g.id}-dotted.png`, dotted(o, w, h), w, h);
    masks[g.id] = { m, w, h };

    // Today's position on a plain lon/lat map, kept inside the puzzle area.
    const cx = 24 + (lc + 180) * PX_PER_DEG;
    const cy = 22 + (84 - pc) * PX_PER_DEG;
    const sx = Math.min(Math.max(Math.round(cx - w / 2), AREA.x), AREA.x + AREA.w - w);
    const sy = Math.min(Math.max(Math.round(cy - h / 2), AREA.y), AREA.y + AREA.h - h);
    const old = prev?.pieces[g.id];
    const start: [number, number] = old?.start ?? [sx, sy];
    const info: PieceInfo = { w, h, start, target: old?.target ?? start };
    if (g.fixed) {
      info.fixed = true;
      info.target = info.start;
    }
    out.pieces[g.id] = info;
    console.log(`${g.id}: ${w}x${h} centre ${lc.toFixed(1)},${pc.toFixed(1)} polygons ${kept.length}/${polys.length}`);
  }
  writeFileSync(PIECES_JSON, JSON.stringify(out, null, 2) + '\n');

  if (existsSync(PATTERNS_JSON)) {
    const patterns: Patterns = JSON.parse(readFileSync(PATTERNS_JSON, 'utf8'));
    const layers = renderPatterns(patterns, BOARD.w, BOARD.h);
    for (const [name, layer] of Object.entries(layers)) {
      for (const [id, { m, w, h }] of Object.entries(masks)) {
        const [tx, ty] = out.pieces[id].target;
        const cut = new Uint8Array(w * h * 4);
        let any = false;
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            if (!m[y * w + x]) continue;
            const bx = tx + x;
            const by = ty + y;
            if (bx < 0 || by < 0 || bx >= BOARD.w || by >= BOARD.h) continue;
            const s = (by * BOARD.w + bx) * 4;
            if (!layer[s + 3]) continue;
            cut.set(layer.subarray(s, s + 4), (y * w + x) * 4);
            any = true;
          }
        if (any) writeRgba(`${PIECES_DIR}/${id}-${name}.png`, cut, w, h);
      }
    }
    console.log(`patterns: ${Object.keys(layers).join(', ')}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
