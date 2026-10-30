import Phaser from 'phaser';
import { enterScene, dbg } from '@engine/debug';
import { DragBoard, type PieceSpec } from '@engine/DragBoard';
import { FONT, PUZZLE_AREA } from '@engine/layout';
import { VIEW_H, VIEW_W } from '@engine/screen';
import config from '../../minigames.json';
import { FieldFlow } from '../minigames/field';
import { worldPieces } from '../data';
import { UI_COLORS, frame } from '@engine/UiScene';

const C = config.strata;
/** Shuffled start order of the South American samples (fixed, no randomness). */
const START_ORDER = [2, 0, 1];
const hex = (c: string) => parseInt(c.slice(1), 16);
/** The small map lives far off to the side of the scene and is shown through its own camera. */
const MAP_OFFSET = 2000;
const SLIDE_MS = 1400;

/** Grey-pattern texture for layer i, drawn white so the board can tint it with the layer colour. */
function drawLayer(g: Phaser.GameObjects.Graphics, i: number, w: number, h: number) {
  g.fillStyle(0xffffff).fillRect(0, 0, w, h);
  g.fillStyle(0xb8b8b8);
  if (i === 0) for (let k = 0; k < 18; k++) g.fillRect((k * 23) % (w - 6) + 2, (k * 11) % (h - 6) + 2, 4, 3); // pebbles
  if (i === 1) {
    for (let y = 4; y < h; y += 6) g.fillRect(0, y, w, 1); // thin shale beds
    g.fillStyle(0x6a6a6a).fillRect(w / 2 - 10, h / 2 - 1, 20, 2).fillRect(w / 2 + 8, h / 2 - 3, 4, 2); // small reptile skeleton mark
  }
  if (i === 2) for (let k = 0; k < 60; k++) g.fillRect((k * 37 + (k % 3) * 11) % w, (k * 13 + (k % 5) * 7) % h, 1, 1); // sand grains
  if (i === 3) for (let x = 6; x < w; x += 10) g.fillRect(x, 0, 1, h); // basalt columns
}

/**
 * Strata comparison (South Africa): drag four South American samples next to the matching
 * layer of the South African column. A wrong spot just leaves the sample there, as in the puzzle.
 */
export class StrataScene extends Phaser.Scene {
  private flow!: FieldFlow;
  private board!: DragBoard;

  constructor() {
    super('Strata');
  }

  create() {
    enterScene('Strata', this);
    this.flow = new FieldFlow(this, 'Strata');
    this.drawBackground();
    const map = this.drawMap();

    const n = C.layers.length;
    const top = C.left[1];
    const yOf = (i: number) => top + (n - 1 - i) * C.h; // layer 0 is the bottom
    const left = this.add.graphics().setDepth(2);
    const label = { fontFamily: FONT.family, fontSize: `${FONT.sizePx}px`, color: '#f4ecd8', backgroundColor: '#121a28', padding: { x: 3, y: 2 } };
    for (let i = 0; i < n; i++) {
      const key = this.layerTex(i);
      this.add.image(C.left[0], yOf(i), key).setOrigin(0).setTint(hex(C.colors[i])).setDepth(1);
      this.add
        .text(C.left[0] - 6, yOf(i) + C.h / 2, this.flow.ui.line(C.layers[i]), label)
        .setOrigin(1, 0.5)
        .setDepth(3);
    }
    left.lineStyle(1, 0x1b2a38).strokeRect(C.left[0] - 0.5, top - 0.5, C.w + 1, C.h * n + 1);

    const specs: PieceSpec[] = C.layers.map((_, i) => ({
      id: `sample-${i + 1}`,
      w: C.w,
      h: C.h,
      start: { x: C.right[0] + (START_ORDER.indexOf(i) % 2) * 12, y: C.right[1] + START_ORDER.indexOf(i) * (C.h + 6) },
      target: { x: C.left[0] + C.w + 4, y: yOf(i) },
      tex: this.layerTex(i),
      outlineTex: this.edgeTex(false),
      dottedTex: this.edgeTex(true),
      layers: {},
      color: hex(C.colors[i]),
    }));
    this.board = new DragBoard(this, specs, PUZZLE_AREA);
    this.board.setEnabled(false);
    dbg.board = this.board;
    this.events.on('ui-opened', () => this.board.setEnabled(false));
    this.events.on('ui-closed', () => !this.flow.over && this.board.setEnabled(true));
    this.board.events.on('snap', () => this.flow.ui.sfx('snap'));

    void (async () => {
      await this.flow.intro('strata-before', 'line-guide-strata');
      this.board.setEnabled(true);
      this.board.events.once('phase-done', () => {
        this.board.setEnabled(false);
        // the layers match: on the map South America slides to Africa and the two places become neighbours
        void map.join().then(() => this.flow.finish('strata-after'));
      });
      this.board.setPhase(specs.map((s) => s.id), []);
    })();
  }

  /**
   * A window on the South Atlantic at today's positions: Karoo (South Africa) and Parana (Brazil) pinned,
   * a dashed line with the distance between them. `join` slides South America onto its fit with Africa.
   */
  private drawMap() {
    const M = C.map;
    const [vx, vy, vw, vh] = M.view;
    const [rx, ry] = M.region;
    const g = this.add.graphics().setDepth(1);
    frame(g, vx - 4, vy - 4, vw + 8, vh + 8);
    const cam = this.cameras.add(vx, vy, vw, vh).setScroll(MAP_OFFSET + rx, ry).setBackgroundColor(0x274660);
    const ox = MAP_OFFSET;
    const pieces = worldPieces();
    const imgs: Record<string, Phaser.GameObjects.Image> = {};
    for (const s of pieces) {
      imgs[s.id] = this.add.image(ox + s.start.x, s.start.y, s.tex).setOrigin(0).setTint(s.color);
    }
    const pins = M.pins as unknown as Record<string, [number, number]>;
    const sa = pieces.find((s) => s.id === 'south-america')!;
    const af = pieces.find((s) => s.id === 'africa')!;
    const pin = (id: string, piece: typeof sa) => ({ x: ox + piece.start.x + pins[id][0], y: piece.start.y + pins[id][1] });
    const a = pin('africa', af);
    const b = pin('south-america', sa);
    const line = this.add.graphics();
    const drawLine = (from: { x: number; y: number }) => {
      line.clear().fillStyle(0xffd23f);
      const d = Math.hypot(a.x - from.x, a.y - from.y);
      for (let t = 4; t < d - 4; t += 4) line.fillRect(Math.round(from.x + ((a.x - from.x) * t) / d), Math.round(from.y + ((a.y - from.y) * t) / d), 2, 1);
    };
    drawLine(b);
    const dot = (p: { x: number; y: number }) => this.add.graphics().fillStyle(0x1b2a38).fillRect(p.x - 2, p.y - 2, 5, 5).fillStyle(0xd9483b).fillRect(p.x - 1, p.y - 1, 3, 3);
    dot({ x: 0, y: 0 }).setPosition(a.x, a.y);
    const pb = dot({ x: 0, y: 0 }).setPosition(b.x, b.y);
    const style = { fontFamily: FONT.family, fontSize: `${FONT.sizePx}px`, color: UI_COLORS.ink, backgroundColor: '#121a28', padding: { x: 2, y: 1 } };
    this.add.text(a.x + 5, a.y - 3, this.flow.ui.line('line-strata-karoo'), style).setOrigin(0, 1);
    const lb = this.add.text(b.x - 4, b.y - 2, this.flow.ui.line('line-strata-parana'), style).setOrigin(1, 1);
    // below the dashed line and a little left of its middle, so the label clears the line and Africa's coast
    const mid = { x: (a.x + b.x) / 2 - 10, y: (a.y + b.y) / 2 };
    const slope = (a.y - b.y) / (a.x - b.x || 1);
    const dist = this.add.text(mid.x, mid.y + Math.max(4, Math.ceil(slope * 46) + 4), this.flow.ui.line('line-strata-distance'), { ...style, color: '#ffd23f' }).setOrigin(0.5, 0);
    // each camera only reaches its own part of the scene (the map sits MAP_OFFSET to the right), so nothing overlaps
    void cam;
    return {
      join: () =>
        new Promise<void>((resolve) => {
          dist.setVisible(false);
          const dx = sa.target.x - sa.start.x;
          const dy = sa.target.y - sa.start.y;
          const from = { x: imgs[sa.id].x, y: imgs[sa.id].y };
          this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: SLIDE_MS,
            ease: 'Sine.easeInOut',
            onUpdate: (tw) => {
              const k = tw.getValue() ?? 0;
              imgs[sa.id].setPosition(Math.round(from.x + dx * k), Math.round(from.y + dy * k));
              const nb = { x: Math.round(b.x + dx * k), y: Math.round(b.y + dy * k) };
              pb.setPosition(nb.x, nb.y);
              lb.setPosition(nb.x - 4, nb.y - 2);
              drawLine(nb);
            },
            onComplete: () => resolve(),
          });
        }),
    };
  }

  private layerTex(i: number): string {
    const key = `gb-strata-${i}`;
    if (!this.textures.exists(key)) {
      const g = this.add.graphics();
      drawLayer(g, i, C.w, C.h);
      g.generateTexture(key, C.w, C.h);
      g.destroy();
    }
    return key;
  }

  private edgeTex(dotted: boolean): string {
    const key = dotted ? 'gb-strata-dotted' : 'gb-strata-edge';
    if (!this.textures.exists(key)) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff);
      for (let x = 0; x < C.w; x++)
        if (!dotted || x % 4 < 2) g.fillRect(x, 0, 1, 1).fillRect(x, C.h - 1, 1, 1);
      for (let y = 0; y < C.h; y++)
        if (!dotted || y % 4 < 2) g.fillRect(0, y, 1, 1).fillRect(C.w - 1, y, 1, 1);
      g.generateTexture(key, C.w, C.h);
      g.destroy();
    }
    return key;
  }

  private drawBackground() {
    if (this.textures.exists('minigames/strata')) {
      this.add.image(0, 0, 'minigames/strata').setOrigin(0);
      return;
    }
    const g = this.add.graphics();
    g.fillStyle(0x2e3a2a).fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(0x5a4636).fillRect(40, 40, 400, 200);
    g.fillStyle(0x6a5442).fillRect(44, 44, 392, 192);
  }
}
