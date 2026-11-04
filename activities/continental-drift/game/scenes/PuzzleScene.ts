import Phaser from 'phaser';
import { DragBoard } from '@engine/DragBoard';
import { FONT, PUZZLE_AREA } from '@engine/layout';
import { VIEW_H, VIEW_W } from '@engine/screen';
import { dbg, enterScene } from '@engine/debug';
import { UI_KEY, type UiScene } from '@engine/UiScene';
import seafloor from '../../art/seafloor/seafloor.json';
import type { Run } from '../run';
import { hash } from '../minigames/stripeArt';
import { DOT_TOTAL, HINT_AFTER_MS, PHASES, WORLD_PHASES, seafloorPieces, worldPieces, type Phase } from '../data';

interface PuzzleData {
  phases?: string[];
  next?: string;
  nextData?: object;
  assembled?: boolean;
}

const SEA = 0x274660;
const SEA_GRID = 0x2d506c;
const RIDGE = 0xd9483b;

/** Drag-to-fit puzzle. Runs the given phases in order with their dialogs, then starts `next`. */
export class PuzzleScene extends Phaser.Scene {
  private board!: DragBoard;
  private phases: Phase[] = [];
  private next = '';
  private nextData: object = {};
  private ui!: UiScene;

  constructor() {
    super('Puzzle');
  }

  init(data: PuzzleData) {
    const ids = data.phases ?? WORLD_PHASES;
    this.phases = ids.map((id) => PHASES.find((p) => p.id === id)!).filter(Boolean);
    this.next = data.next ?? '';
    this.nextData = data.nextData ?? {};
  }

  create(data: PuzzleData) {
    enterScene('Puzzle', this);
    this.ui = this.scene.get(UI_KEY) as UiScene;
    this.ui.bind(this);

    const board = this.phases[0]?.board ?? 'world';
    if (board === 'world') this.drawSea();
    else this.drawSeafloor();
    const specs = board === 'world' ? worldPieces() : seafloorPieces();
    if (data.assembled) for (const s of specs) s.start = { ...s.target };
    // Pieces placed at earlier tables start fixed on their targets.
    for (const id of this.earlierPieces()) {
      const s = specs.find((p) => p.id === id);
      if (s) {
        s.start = { ...s.target };
        s.fixed = true;
      }
    }
    this.board = new DragBoard(this, specs, PUZZLE_AREA, { hintAfterMs: HINT_AFTER_MS });
    dbg.board = this.board;
    if (board !== 'world') this.drawRidgeMark();
    this.events.on('ui-opened', () => this.board.setEnabled(false));
    this.events.on('ui-closed', () => this.board.setEnabled(true));
    this.board.events.on('snap', () => this.ui.sfx('snap'));
    void this.run();
  }

  private drawSea() {
    if (this.textures.exists('sail/sea')) {
      this.add.image(0, 0, 'sail/sea').setOrigin(0);
      return;
    }
    const g = this.add.graphics();
    g.fillStyle(SEA).fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(SEA_GRID);
    for (let x = 0; x < VIEW_W; x += 40) g.fillRect(x, 0, 1, VIEW_H);
    for (let y = 22; y < VIEW_H; y += 40) g.fillRect(0, y, VIEW_W, 1);
  }

  /**
   * The stripe table as a cross-section of the ocean floor, like the survey scene: deep water above,
   * the slot of crust where the stripe pieces go, then gabbro and the mantle with magma under the ridge.
   */
  private drawSeafloor() {
    const key = 'gb-seafloor-section';
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, VIEW_W, VIEW_H)!;
      const ctx = tex.getContext();
      const img = ctx.createImageData(VIEW_W, VIEW_H);
      const top = seafloor.pieces.ridge.target[1];
      const bottom = top + seafloor.pieces.ridge.h;
      for (let y = 0; y < VIEW_H; y++)
        for (let x = 0; x < VIEW_W; x++) {
          const c = seafloorColor(x, y, top, bottom, seafloor.ridgeX);
          const k = (y * VIEW_W + x) * 4;
          img.data[k] = (c >> 16) & 255;
          img.data[k + 1] = (c >> 8) & 255;
          img.data[k + 2] = c & 255;
          img.data[k + 3] = 255;
        }
      ctx.putImageData(img, 0, 0);
      tex.refresh();
    }
    this.add.image(0, 0, key).setOrigin(0);
  }

  /** A red line and small peaks mark the mid-ocean ridge, drawn above the stripes. */
  private drawRidgeMark() {
    const x = seafloor.ridgeX;
    const top = seafloor.pieces.ridge.target[1];
    const h = seafloor.pieces.ridge.h;
    const g = this.add.graphics().setDepth(950);
    g.fillStyle(RIDGE).fillRect(x - 1, top - 6, 2, h + 12);
    for (const y of [top - 6, top + h + 6]) {
      g.fillRect(x - 3, y - 1, 6, 2).fillRect(x - 2, y - 3, 4, 2);
    }
    this.add
      .text(x, top - 9, this.ui.line('line-label-ridge'), { fontFamily: FONT.family, fontSize: `${FONT.sizePx}px`, color: '#ff8a7a' })
      .setOrigin(0.5, 1)
      .setDepth(950);
  }

  /** World phases before the first phase of this visit, in order. */
  private earlierPhases(): Phase[] {
    const first = this.phases[0];
    if (!first || first.board !== 'world') return [];
    const i = WORLD_PHASES.indexOf(first.id);
    return WORLD_PHASES.slice(0, Math.max(0, i)).map((id) => PHASES.find((p) => p.id === id)!);
  }

  private earlierPieces(): string[] {
    return this.earlierPhases().flatMap((p) => p.move);
  }

  private async run() {
    const shown = this.earlierPhases()
      .map((p) => p.pattern)
      .filter((p): p is string => !!p);
    for (const phase of this.phases) {
      dbg.phase = phase.id;
      this.board.setEnabled(false);
      if (phase.recall && phase.pattern) {
        // pieces placed earlier already carry this pattern: show it on them first
        const recall = phase.recall;
        this.board.showPatterns([...shown, phase.pattern]);
        await new Promise<void>((r) => this.board.flash(recall.pieces, 2, r, true));
        await this.ui.say(recall.say);
      }
      await this.ui.say(phase.before);
      const dots = phase.dot === null ? null : { done: phase.dot, total: DOT_TOTAL };
      this.ui.setGuide(phase.guide, dots);
      this.board.setEnabled(true);
      await new Promise<void>((resolve) => {
        this.board.events.once('phase-done', resolve);
        if (phase.pattern) shown.push(phase.pattern);
        this.board.setPhase(phase.move, [...shown]);
      });
      this.ui.sfx('done');
      this.ui.setGuide(null);
      if (phase.id === 'mountain') {
        await new Promise<void>((r) => this.board.flashAll(2, r));
        await this.ui.say(phase.after);
        await this.ui.say('merge-after');
      } else {
        await this.ui.say(phase.after);
      }
      const run = this.registry.get('run') as Run | undefined;
      run?.complete(phase.board === 'world' ? 'table' : 'stripes');
    }
    dbg.phase = null;
    if (this.next) this.scene.start(this.next, this.nextData);
  }
}

/** Background pixel of the stripe table: water, an empty crust slot, gabbro, mantle, magma under the ridge. */
function seafloorColor(x: number, y: number, top: number, bottom: number, ridgeX: number): number {
  const n = hash(x, y);
  const d = Math.abs(x - ridgeX);
  if (y < top - 2) {
    // deep water in flat bands with a checker step between them
    const edge = 30;
    if (y < edge - 1) return 0x274660;
    if (y > edge) return 0x1f3b55;
    return (x + y) % 2 === 0 ? 0x274660 : 0x1f3b55;
  }
  if (y < top) return 0x1b2a38;
  if (y < bottom) return n < 0.06 ? 0x30363e : 0x262c34; // the slot where the crust pieces go
  if (y < bottom + 18) return n < 0.12 ? 0x4e5660 : n < 0.2 ? 0x262c34 : 0x353c46; // gabbro
  const conduit = 2 + Math.floor((y - bottom - 18) / 24);
  if (d <= conduit) return n < 0.25 ? 0xf0a050 : 0xd9683b;
  const glow = d < 36 + (y - bottom - 18) * 0.6 + (hash(y, 3) - 0.5) * 10 ? 0x7a4a36 : 0x5e3a2e;
  return n < 0.08 ? 0x8a5a42 : n < 0.16 ? 0x4a2e26 : glow;
}
