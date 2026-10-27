import type Phaser from 'phaser';
import type { Pt } from './layout';
import { VIEW_W } from './screen';

/** Live game facts the e2e tests read through window.__nos (dev server only). */
export const dbg = {
  game: null as Phaser.Game | null,
  scene: '',
  phase: null as string | null,
  choiceCount: 0,
  ui: null as null | { status: { dialog: boolean; choice: boolean; guide: string | null } },
  board: null as null | {
    info(id: string): { pos: Pt; target: Pt; snapped: boolean; size: { w: number; h: number } } | null;
    movableIds(): string[];
    grabOffset(id: string): Pt | null;
  },
  world: null as Phaser.Scene | null,
  measureCanvas: null as null | ((s: string) => number),
};

export interface NosDebug {
  state(): {
    scene: string;
    phase: string | null;
    dialog: boolean;
    choice: boolean;
    guide: string | null;
    zoom: number;
    choiceCount: number;
    world: { x: number; y: number; zoom: number; scrollX: number; scrollY: number } | null;
  };
  piece(id: string): ReturnType<NonNullable<typeof dbg.board>['info']>;
  movable(): string[];
  grabOffset(id: string): Pt | null;
  toScreen(p: Pt): Pt;
  measureCanvas(s: string): number;
}

export function installDebug(): void {
  if (!import.meta.env.DEV) return;
  const api: NosDebug = {
    state() {
      const cam = dbg.world?.cameras.main;
      return {
        scene: dbg.scene,
        phase: dbg.phase,
        dialog: dbg.ui?.status.dialog ?? false,
        choice: dbg.ui?.status.choice ?? false,
        guide: dbg.ui?.status.guide ?? null,
        zoom: dbg.game?.scale.zoom ?? 0,
        choiceCount: dbg.choiceCount,
        world: cam ? { x: cam.x, y: cam.y, zoom: cam.zoom, scrollX: cam.scrollX, scrollY: cam.scrollY } : null,
      };
    },
    piece: (id) => dbg.board?.info(id) ?? null,
    movable: () => dbg.board?.movableIds() ?? [],
    grabOffset: (id) => dbg.board?.grabOffset(id) ?? null,
    toScreen(p) {
      const r = dbg.game!.canvas.getBoundingClientRect();
      const k = r.width / VIEW_W;
      return { x: r.left + p.x * k, y: r.top + p.y * k };
    },
    measureCanvas: (s) => dbg.measureCanvas?.(s) ?? -1,
  };
  (window as unknown as { __nos: NosDebug }).__nos = api;
}
