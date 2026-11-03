// Activity data that the scenes share: piece masks, phases and asset URLs.
import piecesFile from '../art/pieces/pieces.json';
import puzzle from '../puzzle.json';
import seafloor from '../art/seafloor/seafloor.json';
import type { PieceSpec } from '@engine/DragBoard';

export interface Phase {
  id: string;
  board: 'world' | 'seafloor';
  move: string[];
  pattern: string | null;
  dot: number | null;
  before: string;
  /** Pieces placed earlier that already show this phase's pattern: they light up while `say` plays, before `before`. */
  recall?: { pieces: string[]; say: string };
  guide: string;
  after: string;
}

export const PHASES = puzzle.phases as Phase[];
export const WORLD_PHASES = PHASES.filter((p) => p.board === 'world').map((p) => p.id);
export const DOT_TOTAL = PHASES.filter((p) => p.dot !== null).length;

/** Every PNG under the activity art folder, keyed by path relative to art/ without extension. */
const urls = import.meta.glob('../art/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const ART: Record<string, string> = Object.fromEntries(
  Object.entries(urls).map(([path, url]) => [path.replace(/^.*\/art\//, '').replace(/\.png$/, ''), url]),
);

/** Background music, one track per place, keyed by file name (lab, india, australia, africa, debate, sea). */
const musicUrls = import.meta.glob('../music/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export const MUSIC: Record<string, string> = Object.fromEntries(
  Object.entries(musicUrls).map(([path, url]) => [path.replace(/^.*\//, '').replace(/\.mp3$/, ''), url]),
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
      // generated land art (cut to the same mask) when present, else the white mask tinted
      tex: ART[`pieces/${id}-art`] ? `pieces/${id}-art` : `pieces/${id}`,
      outlineTex: `pieces/${id}-outline`,
      dottedTex: `pieces/${id}-dotted`,
      layers,
      color: ART[`pieces/${id}-art`] ? 0xffffff : hex((puzzle.colors as Record<string, string>)[id] ?? '#cccccc'),
    };
  });
}

/** Sea-floor stripe pieces: a fixed ridge (left flank + ridge band) and three right-flank strips. */
export function seafloorPieces(): PieceSpec[] {
  return Object.entries(seafloor.pieces).map(([id, p]) => {
    const info = p as { w: number; h: number; start: number[]; target: number[]; fixed?: boolean };
    return {
      id,
      w: info.w,
      h: info.h,
      start: { x: info.start[0], y: info.start[1] },
      target: { x: info.target[0], y: info.target[1] },
      fixed: info.fixed,
      tex: `seafloor/${id}`,
      outlineTex: `seafloor/${id}-outline`,
      dottedTex: `seafloor/${id}-dotted`,
      layers: {},
      color: 0xffffff,
    };
  });
}
