// Activity data that the scenes share: piece masks, phases and asset URLs.
import piecesFile from '../../../activities/continental-drift/art/pieces/pieces.json';
import puzzle from '../../../activities/continental-drift/puzzle.json';
import type { PieceSpec } from '../common/DragBoard';

export interface Phase {
  id: string;
  board: 'world' | 'seafloor';
  move: string[];
  pattern: string | null;
  dot: number | null;
  before: string;
  guide: string;
  after: string;
}

export const PHASES = puzzle.phases as Phase[];
export const WORLD_PHASES = PHASES.filter((p) => p.board === 'world').map((p) => p.id);
export const DOT_TOTAL = PHASES.filter((p) => p.dot !== null).length;

/** Every PNG under the activity art folder, keyed by path relative to art/ without extension. */
const urls = import.meta.glob('../../../activities/continental-drift/art/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const ART: Record<string, string> = Object.fromEntries(
  Object.entries(urls).map(([path, url]) => [path.replace(/^.*\/art\//, '').replace(/\.png$/, ''), url]),
);

const hex = (c: string) => parseInt(c.slice(1), 16);

export function worldPieces(): PieceSpec[] {
  return Object.entries(piecesFile.pieces).map(([id, p]) => {
    const info = p as { w: number; h: number; start: number[]; target: number[]; fixed?: boolean };
    const layers: Record<string, string> = {};
    for (const name of ['fossil', 'glacier', 'mountain']) {
      if (ART[`pieces/${id}-${name}`]) layers[name] = `pieces/${id}-${name}`;
    }
    return {
      id,
      w: info.w,
      h: info.h,
      start: { x: info.start[0], y: info.start[1] },
      target: { x: info.target[0], y: info.target[1] },
      fixed: info.fixed,
      tex: `pieces/${id}`,
      outlineTex: `pieces/${id}-outline`,
      dottedTex: `pieces/${id}-dotted`,
      layers,
      color: hex((puzzle.colors as Record<string, string>)[id] ?? '#cccccc'),
    };
  });
}
