import Phaser from 'phaser';
import { DragBoard } from '../../common/DragBoard';
import { PUZZLE_AREA } from '../../common/layout';
import { VIEW_H, VIEW_W } from '../../common/screen';
import { dbg } from '../../common/debug';
import { UI_KEY, type UiScene } from '../../common/UiScene';
import { DOT_TOTAL, PHASES, WORLD_PHASES, seafloorPieces, worldPieces, type Phase } from '../data';

interface PuzzleData {
  phases?: string[];
  next?: string;
  assembled?: boolean;
}

const SEA = 0x274660;
const SEA_GRID = 0x2d506c;
const DEEP = 0x1d3448;

/** Drag-to-fit puzzle. Runs the given phases in order with their dialogs, then starts `next`. */
export class PuzzleScene extends Phaser.Scene {
  private board!: DragBoard;
  private phases: Phase[] = [];
  private next = '';
  private ui!: UiScene;

  constructor() {
    super('Puzzle');
  }

  init(data: PuzzleData) {
    const ids = data.phases ?? WORLD_PHASES;
    this.phases = ids.map((id) => PHASES.find((p) => p.id === id)!).filter(Boolean);
    this.next = data.next ?? (data.phases ? '' : 'Debate');
  }

  create(data: PuzzleData) {
    dbg.scene = 'Puzzle';
    dbg.world = this;
    dbg.phase = null;
    this.ui = this.scene.get(UI_KEY) as UiScene;
    this.ui.bind(this);

    const board = this.phases[0]?.board ?? 'world';
    if (board === 'world') this.drawSea();
    else this.drawSeafloor();
    const specs = board === 'world' ? worldPieces() : seafloorPieces();
    if (data.assembled) for (const s of specs) s.start = { ...s.target };
    this.board = new DragBoard(this, specs, PUZZLE_AREA);
    dbg.board = this.board;
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

  private async run() {
    for (const phase of this.phases) {
      dbg.phase = phase.id;
      this.board.setEnabled(false);
      await this.ui.say(phase.before);
      const dots = phase.dot === null ? null : { done: phase.dot, total: DOT_TOTAL };
      this.ui.setGuide(phase.guide, dots);
      this.board.setEnabled(true);
      await new Promise<void>((resolve) => {
        this.board.events.once('phase-done', resolve);
        this.board.setPhase(phase.move, phase.pattern);
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
    }
    dbg.phase = null;
    if (this.next) this.scene.start(this.next);
  }
}
