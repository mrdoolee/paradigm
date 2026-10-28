// Grid walking for towns and the sailing map: breadth-first paths, no physics.

export interface Cell {
  x: number;
  y: number;
}

export interface Grid {
  w: number;
  h: number;
  open(x: number, y: number): boolean;
}

export function gridFromRows(rows: string[], walkable: string): Grid {
  const h = rows.length;
  const w = Math.max(0, ...rows.map((r) => r.length));
  return {
    w,
    h,
    open: (x, y) => x >= 0 && y >= 0 && x < w && y < h && walkable.includes(rows[y][x] ?? ''),
  };
}

// Up, right, down, left first, then diagonals: a fixed order keeps paths the same every run.
const STEPS4 = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
const STEPS8 = [...STEPS4, [1, -1], [1, 1], [-1, 1], [-1, -1]];

function neighbours(g: Grid, c: Cell, diagonal: boolean): Cell[] {
  const out: Cell[] = [];
  for (const [dx, dy] of diagonal ? STEPS8 : STEPS4) {
    const x = c.x + dx;
    const y = c.y + dy;
    if (!g.open(x, y)) continue;
    if (dx && dy && !(g.open(c.x + dx, c.y) && g.open(c.x, c.y + dy))) continue;
    out.push({ x, y });
  }
  return out;
}

/** Cells from `from` (excluded) to `to` (included); [] when already there; null when unreachable. */
export function findPath(g: Grid, from: Cell, to: Cell, diagonal = false): Cell[] | null {
  if (from.x === to.x && from.y === to.y) return [];
  if (!g.open(to.x, to.y)) return null;
  const key = (c: Cell) => c.y * g.w + c.x;
  const prev = new Map<number, Cell | null>([[key(from), null]]);
  const queue: Cell[] = [from];
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i];
    for (const n of neighbours(g, c, diagonal)) {
      const k = key(n);
      if (prev.has(k)) continue;
      prev.set(k, c);
      if (n.x === to.x && n.y === to.y) {
        const path: Cell[] = [];
        for (let p: Cell | null = n; p && key(p) !== key(from); p = prev.get(key(p)) ?? null) path.push(p);
        return path.reverse();
      }
      queue.push(n);
    }
  }
  return null;
}

/**
 * Where to stand to reach `target`: the target itself if open, else the open neighbour
 * (4 directions) with the shortest path from `from`. Null if none is reachable.
 */
export function nearestOpen(g: Grid, target: Cell, from: Cell): Cell | null {
  if (g.open(target.x, target.y)) return target;
  let best: Cell | null = null;
  let bestLen = Infinity;
  for (const [dx, dy] of STEPS4) {
    const c = { x: target.x + dx, y: target.y + dy };
    const p = findPath(g, from, c);
    if (p && p.length < bestLen) {
      best = c;
      bestLen = p.length;
    }
  }
  return best;
}

/** Length of a path walked from `from` (default the origin); a diagonal step counts root 2. */
export function pathLength(path: Cell[], from: Cell = { x: 0, y: 0 }): number {
  let len = 0;
  let prev = from;
  for (const c of path) {
    len += prev.x !== c.x && prev.y !== c.y ? Math.SQRT2 : 1;
    prev = c;
  }
  return len;
}
