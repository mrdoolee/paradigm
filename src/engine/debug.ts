import type Phaser from 'phaser';
import type { Pt } from './layout';
import { VIEW_W } from './screen';

/** Live game facts the e2e tests read through window.__nos (dev server only). */
export const dbg = {
  game: null as Phaser.Game | null,
  scene: '',
  phase: null as string | null,
  choiceCount: 0,
  ui: null as null | {
    status: {
      dialog: boolean;
      choice: boolean;
      guide: string | null;
      sound: boolean;
      music: string | null;
      rotate: boolean;
    };
  },
  board: null as null | {
    info(id: string): { pos: Pt; target: Pt; snapped: boolean; size: { w: number; h: number } } | null;
    movableIds(): string[];
    hintShown(): boolean;
    grabOffset(id: string): Pt | null;
  },
  world: null as Phaser.Scene | null,
  measureCanvas: null as null | ((s: string) => number),
  /** Virtual point to press for the current goal (towns, sailing). */
  goalPoint: null as null | (() => Pt | null),
  player: null as null | (() => { x: number; y: number } | null),
  /** Mini-game: its kind and the virtual points still to press or rub. */
  minigame: null as null | (() => { kind: string; todo: Pt[] }),
  /** Summary window: current page, page count, and where to press next. */
  summary: null as null | (() => SummaryInfo),
};

export interface SummaryInfo {
  page: number;
  pages: number;
  next: Pt | null;
  links: Pt[];
}

/** Every world scene calls this first in create(): names the scene and clears the old hooks. */
export function enterScene(name: string, scene: Phaser.Scene): void {
  dbg.scene = name;
  dbg.world = scene;
  dbg.board = null;
  dbg.phase = null;
  dbg.goalPoint = null;
  dbg.player = null;
  dbg.minigame = null;
  dbg.summary = null;
}

export interface NosDebug {
  state(): {
    scene: string;
    phase: string | null;
    dialog: boolean;
    choice: boolean;
    guide: string | null;
    sound: boolean;
    music: string | null;
    rotate: boolean;
    zoom: number;
    choiceCount: number;
    world: { x: number; y: number; zoom: number; scrollX: number; scrollY: number } | null;
  };
  piece(id: string): ReturnType<NonNullable<typeof dbg.board>['info']>;
  movable(): string[];
  hint(): boolean | null;
  grabOffset(id: string): Pt | null;
  toScreen(p: Pt): Pt;
  measureCanvas(s: string): number;
  goalPoint(): Pt | null;
  player(): { x: number; y: number } | null;
  minigame(): { kind: string; todo: Pt[] } | null;
  summary(): SummaryInfo | null;
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
        sound: dbg.ui?.status.sound ?? false,
        music: dbg.ui?.status.music ?? null,
        rotate: dbg.ui?.status.rotate ?? false,
        zoom: dbg.game?.scale.zoom ?? 0,
        choiceCount: dbg.choiceCount,
        world: cam ? { x: cam.x, y: cam.y, zoom: cam.zoom, scrollX: cam.scrollX, scrollY: cam.scrollY } : null,
      };
    },
    piece: (id) => dbg.board?.info(id) ?? null,
    movable: () => dbg.board?.movableIds() ?? [],
    hint: () => dbg.board?.hintShown() ?? null,
    grabOffset: (id) => dbg.board?.grabOffset(id) ?? null,
    toScreen(p) {
      const r = dbg.game!.canvas.getBoundingClientRect();
      const k = r.width / VIEW_W;
      return { x: r.left + p.x * k, y: r.top + p.y * k };
    },
    measureCanvas: (s) => dbg.measureCanvas?.(s) ?? -1,
    goalPoint: () => dbg.goalPoint?.() ?? null,
    player: () => dbg.player?.() ?? null,
    minigame: () => dbg.minigame?.() ?? null,
    summary: () => dbg.summary?.() ?? null,
  };
  (window as unknown as { __nos: NosDebug }).__nos = api;
}
