import Phaser from 'phaser';
import { DragBoard } from '../../common/DragBoard';
import { PUZZLE_AREA, TOPBAR } from '../../common/layout';
import { VIEW_H, VIEW_W } from '../../common/screen';
import { dbg } from '../../common/debug';
import { DOT_TOTAL, PHASES, WORLD_PHASES, worldPieces, type Phase } from '../data';

interface PuzzleData {
  phases?: string[];
  next?: string;
  assembled?: boolean;
}

const SEA = 0x274660;
const SEA_GRID = 0x2d506c;

/** Drag-to-fit puzzle. Runs the given phases in order, then starts `next`. */
export class PuzzleScene extends Phaser.Scene {
  private board!: DragBoard;
  private phases: Phase[] = [];
  private next = '';
  private dots: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super('Puzzle');
  }

  init(data: PuzzleData) {
    const ids = data.phases ?? WORLD_PHASES;
    this.phases = ids.map((id) => PHASES.find((p) => p.id === id)!);
    this.next = data.next ?? '';
  }

  create(data: PuzzleData) {
    dbg.scene = 'Puzzle';
    dbg.world = this;
    this.drawSea();
    const specs = worldPieces();
    if (data.assembled) for (const s of specs) s.start = { ...s.target };
    this.board = new DragBoard(this, specs, PUZZLE_AREA);
    dbg.board = this.board;
    this.dots = this.add.graphics().setDepth(1000);
    void this.run();
  }

  private drawSea() {
    const g = this.add.graphics();
    g.fillStyle(SEA).fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(SEA_GRID);
    for (let x = 0; x < VIEW_W; x += 40) g.fillRect(x, PUZZLE_AREA.y, 1, PUZZLE_AREA.h);
    for (let y = PUZZLE_AREA.y; y < PUZZLE_AREA.y + PUZZLE_AREA.h; y += 40) g.fillRect(0, y, VIEW_W, 1);
    g.fillStyle(0x1a2733).fillRect(TOPBAR.x, TOPBAR.y, TOPBAR.w, TOPBAR.h);
  }

  private drawDots(phase: Phase | null) {
    const g = this.dots!;
    g.clear();
    if (!phase || phase.dot === null) return;
    for (let i = 0; i < DOT_TOTAL; i++) {
      const x = TOPBAR.w - 12 - (DOT_TOTAL - 1 - i) * 12;
      g.fillStyle(i <= phase.dot ? 0xfff6c8 : 0x4a5a6a).fillCircle(x, 11, 3);
    }
  }

  private async run() {
    for (const phase of this.phases) {
      dbg.phase = phase.id;
      this.drawDots(phase);
      await new Promise<void>((resolve) => {
        this.board.events.once('phase-done', resolve);
        this.board.setPhase(phase.move, phase.pattern);
      });
      this.drawDots(null);
      if (phase.id === 'mountain') await new Promise<void>((r) => this.board.flashAll(2, r));
    }
    dbg.phase = null;
    if (this.next) this.scene.start(this.next);
  }
}
