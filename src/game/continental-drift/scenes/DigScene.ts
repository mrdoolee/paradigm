import Phaser from 'phaser';
import { bindActions } from '../../common/actions';
import { dbg, enterScene } from '../../common/debug';
import { VIEW_H, VIEW_W } from '../../common/screen';
import config from '../../../../activities/continental-drift/minigames.json';
import { FieldFlow } from '../minigames/field';
import { DigBoard } from '../minigames/logic';

const C = config.dig;
const ROCK = [0x8a6a4a, 0x7a5c3e, 0x94744f];
const DIRT = 0xa07f5a;
const DIRT_EDGE = 0x6b4f33;
const LEAF = 0x3f7f32;
const CURSOR = 0xffd23f;

/** Fossil dig (India): press or drag over dirt cells to clear them until every leaf fossil shows. */
export class DigScene extends Phaser.Scene {
  private board!: DigBoard;
  private flow!: FieldFlow;
  private dirt: (Phaser.GameObjects.Rectangle | null)[] = [];
  private cursor = { x: 0, y: 0 };
  private cursorBox!: Phaser.GameObjects.Graphics;
  private down = false;
  private started = false;

  constructor() {
    super('Dig');
  }

  create() {
    enterScene('Dig', this);
    this.started = false;
    this.down = false;
    this.flow = new FieldFlow(this, 'Dig');
    this.board = new DigBoard(C.cols, C.rows, C.fossils);
    this.drawRock();
    this.dirt = [];
    for (let y = 0; y < C.rows; y++)
      for (let x = 0; x < C.cols; x++) {
        const p = this.cellPx(x, y);
        this.dirt.push(this.add.rectangle(p.x, p.y, C.cell, C.cell, DIRT).setOrigin(0).setStrokeStyle(1, DIRT_EDGE).setDepth(10));
      }
    this.cursorBox = this.add.graphics().setDepth(20);
    this.cursor = { x: 0, y: 0 };

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.down = true;
      this.digAt(p.x, p.y);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.down && p.isDown && this.digAt(p.x, p.y));
    this.input.on('pointerup', () => (this.down = false));
    this.input.on('pointerupoutside', () => (this.down = false));
    this.events.on('ui-opened', () => (this.down = false));
    bindActions(this, (a) => {
      if (!this.started || this.flow.over) return;
      const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] } as Record<string, number[]>;
      if (a in d) {
        this.cursor.x = Phaser.Math.Clamp(this.cursor.x + d[a][0], 0, C.cols - 1);
        this.cursor.y = Phaser.Math.Clamp(this.cursor.y + d[a][1], 0, C.rows - 1);
        this.drawCursor();
      } else if (a === 'confirm') this.dig(this.cursor.x, this.cursor.y);
    });

    dbg.minigame = () => ({
      kind: 'dig',
      todo: this.board.remaining().map((c) => {
        const p = this.cellPx(c.x, c.y);
        return { x: p.x + C.cell / 2, y: p.y + C.cell / 2 };
      }),
    });

    void (async () => {
      await this.flow.intro('dig-before', 'line-guide-dig', this.dots());
      this.started = true;
      this.drawCursor();
    })();
  }

  private dots() {
    return { done: this.board.found() - 1, total: C.fossils.length };
  }

  private cellPx(x: number, y: number) {
    return { x: C.origin[0] + x * C.cell, y: C.origin[1] + y * C.cell };
  }

  private digAt(px: number, py: number) {
    if (!this.started || this.flow.over) return;
    const x = Math.floor((px - C.origin[0]) / C.cell);
    const y = Math.floor((py - C.origin[1]) / C.cell);
    this.dig(x, y);
  }

  private dig(x: number, y: number) {
    if (this.flow.over || !this.board.dig(x, y)) return;
    this.dirt[y * C.cols + x]?.destroy();
    this.dirt[y * C.cols + x] = null;
    this.flow.ui.setGuide('line-guide-dig', this.dots());
    if (this.board.done()) {
      this.cursorBox.clear();
      void this.flow.finish('dig-after');
    }
  }

  private drawCursor() {
    const p = this.cellPx(this.cursor.x, this.cursor.y);
    this.cursorBox.clear().lineStyle(1, CURSOR).strokeRect(p.x + 0.5, p.y + 0.5, C.cell - 1, C.cell - 1);
  }

  /** Rock layers with leaf fossils (tongue-shaped leaves with a midrib) under the dirt. */
  private drawRock() {
    if (this.textures.exists('minigames/dig')) {
      this.add.image(0, 0, 'minigames/dig').setOrigin(0);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x3a2a1c).fillRect(0, 0, VIEW_W, VIEW_H);
      for (let i = 0; i < 12; i++) g.fillStyle(ROCK[i % 3]).fillRect(0, 22 + i * 20, VIEW_W, 20);
    }
    const g = this.add.graphics().setDepth(5);
    for (const f of C.fossils) {
      const p = this.cellPx(f.x, f.y);
      const w = f.w * C.cell;
      const h = f.h * C.cell;
      const horiz = w >= h;
      g.fillStyle(LEAF);
      if (horiz) {
        g.fillEllipse(p.x + w / 2, p.y + h / 2, w - 6, h - 10);
        g.fillStyle(0x2a5a22).fillRect(p.x + 4, p.y + h / 2, w - 8, 1);
      } else {
        g.fillEllipse(p.x + w / 2, p.y + h / 2, w - 10, h - 6);
        g.fillStyle(0x2a5a22).fillRect(p.x + w / 2, p.y + 4, 1, h - 8);
      }
    }
  }
}
