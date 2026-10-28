import Phaser from 'phaser';
import { DragBoard } from '../../common/DragBoard';
import { FONT, PUZZLE_AREA } from '../../common/layout';
import { VIEW_H, VIEW_W } from '../../common/screen';
import { dbg, enterScene } from '../../common/debug';
import { UI_KEY, type UiScene } from '../../common/UiScene';
import seafloor from '../../../../activities/continental-drift/art/seafloor/seafloor.json';
import type { Run } from '../run';
import { DOT_TOTAL, PHASES, WORLD_PHASES, seafloorPieces, worldPieces, type Phase } from '../data';

interface PuzzleData {
  phases?: string[];
  next?: string;
  nextData?: object;
  assembled?: boolean;
}

const SEA = 0x274660;
const SEA_GRID = 0x2d506c;
const DEEP = 0x1d3448;
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
    this.board = new DragBoard(this, specs, PUZZLE_AREA);
    dbg.board = this.board;
    if (board !== 'world') this.drawRidgeMark();
    this.events.on('ui-opened', () => this.board.setEnabled(false));
    this.events.on('ui-closed', () => this.board.setEnabled(true));
    this.board.events.on('snap', () => this.ui.sfx('snap'));
    void this.run();
  }

  private drawSea() {
    const g = this.add.graphics();
    g.fillStyle(SEA).fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(SEA_GRID);
    for (let x = 0; x < VIEW_W; x += 40) g.fillRect(x, 0, 1, VIEW_H);
    for (let y = 22; y < VIEW_H; y += 40) g.fillRect(0, y, VIEW_W, 1);
  }

  /** Grey-box sea floor: deep water with a lighter mid-ocean ridge band in the middle. */
  private drawSeafloor() {
    const g = this.add.graphics();
    g.fillStyle(DEEP).fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(SEA_GRID);
    for (let y = 22; y < VIEW_H; y += 40) g.fillRect(0, y, VIEW_W, 1);
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
