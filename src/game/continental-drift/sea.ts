// The sailing grid: continents at today's positions, cut into cells, plus hand edits from sail.json.
import seaGrid from '../../../activities/continental-drift/art/sea/sea-grid.json';
import sail from '../../../activities/continental-drift/sail.json';
import { findPath, pathLength, type Cell, type Grid } from '../common/grid';
import type { Pt } from '../common/layout';
import type { PortId } from './run';

export const SEA_CELL = sail.cell;
export const SAIL_SPEED = sail.speedCellsPerSec;
export const PORTS = sail.ports as Record<PortId, { at: [number, number]; label: string; side?: 'left' | 'right' }>;

/** Canals the ship can pass (one sea cell each); the captain says a word the first time. */
export const CANALS = (sail as unknown as { canals?: Record<string, { cell: [number, number]; talk: string }> }).canals ?? {};

export function seaGrid0(): Grid {
  const open = new Set((sail.open as number[][]).map(([x, y]) => `${x},${y}`));
  const block = new Set((sail.block as number[][]).map(([x, y]) => `${x},${y}`));
  const rows = seaGrid.rows as string[];
  return {
    w: seaGrid.w,
    h: seaGrid.h,
    open: (x, y) => {
      if (x < 0 || y < 0 || x >= seaGrid.w || y >= seaGrid.h) return false;
      const k = `${x},${y}`;
      if (block.has(k)) return false;
      return open.has(k) || rows[y][x] === '.';
    },
  };
}

export const SEA: Grid = seaGrid0();

export function toCell(p: Pt): Cell {
  return { x: Math.floor(p.x / SEA_CELL), y: Math.floor(p.y / SEA_CELL) };
}

export function cellCenter(c: Cell): Pt {
  return { x: c.x * SEA_CELL + SEA_CELL / 2, y: c.y * SEA_CELL + SEA_CELL / 2 };
}

export function portCell(id: PortId): Cell {
  const [x, y] = PORTS[id].at;
  return toCell({ x, y });
}

/** Seconds to sail between two ports along the shortest sea path (Infinity if none). */
export function sailSeconds(from: PortId, to: PortId): number {
  const a = portCell(from);
  const p = findPath(SEA, a, portCell(to), true);
  return p ? pathLength(p, a) / SAIL_SPEED : Infinity;
}

/** The sea cell nearest to a point (for presses on land). */
export function nearestSea(p: Pt): Cell | null {
  const c = toCell(p);
  let best: Cell | null = null;
  let bestD = Infinity;
  for (let r = 0; r < 40 && !best; r++)
    for (let y = c.y - r; y <= c.y + r; y++)
      for (let x = c.x - r; x <= c.x + r; x++) {
        if (!SEA.open(x, y)) continue;
        const d = (x - c.x) ** 2 + (y - c.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = { x, y };
        }
      }
  return best;
}
