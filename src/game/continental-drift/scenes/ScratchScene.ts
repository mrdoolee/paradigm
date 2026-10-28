import Phaser from 'phaser';
import { bindActions } from '../../common/actions';
import { dbg, enterScene } from '../../common/debug';
import { VIEW_H, VIEW_W } from '../../common/screen';
import config from '../../../../activities/continental-drift/minigames.json';
import { FieldFlow } from '../minigames/field';
import { SCRATCH_DONE, ScratchField } from '../minigames/logic';

const C = config.scratch;
const ROCK = 0x8a8f96;
const ROCK_DARK = 0x6e737a;
const SCRATCH = 0xd8dde4;
const DIRT = 0x8a6a4a;
const DIRT_DOT = 0x7a5c3e;
const ARROW = 0x7fd0ff;
const CURSOR = 0xffd23f;

/** Glacier marks (Australia): rub the dirt off a rock face until the parallel scratches show. */
export class ScratchScene extends Phaser.Scene {
  private field!: ScratchField;
  private flow!: FieldFlow;
  private dirt!: Phaser.GameObjects.Graphics;
  private cursorBox!: Phaser.GameObjects.Graphics;
  private brush = { x: 0, y: 0 };
  private started = false;

  constructor() {
    super('Scratch');
  }

  create() {
    enterScene('Scratch', this);
    this.started = false;
    this.flow = new FieldFlow(this, 'Scratch');
    this.field = new ScratchField(C.cols, C.rows);
    this.drawRock();
    this.dirt = this.add.graphics().setDepth(10);
    this.cursorBox = this.add.graphics().setDepth(20);
    this.brush = { x: Math.floor(C.cols / 2), y: Math.floor(C.rows / 2) };
    this.redrawDirt();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.rubAt(p.x, p.y));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => p.isDown && this.rubAt(p.x, p.y));
    bindActions(this, (a) => {
      if (!this.started || this.flow.over) return;
      const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] } as Record<string, number[]>;
      if (a in d) {
        this.brush.x = Phaser.Math.Clamp(this.brush.x + d[a][0] * 2, 0, C.cols - 1);
        this.brush.y = Phaser.Math.Clamp(this.brush.y + d[a][1] * 2, 0, C.rows - 1);
        this.rub(this.brush.x, this.brush.y);
      } else if (a === 'confirm') this.rub(this.brush.x, this.brush.y);
    });

    dbg.minigame = () => {
      const todo: { x: number; y: number }[] = [];
      for (let y = 1; y < C.rows; y += 3)
        for (let x = 1; x < C.cols; x += 3)
          if (!this.field.isCleared(x, y)) todo.push({ x: C.origin[0] + x * C.cell + C.cell / 2, y: C.origin[1] + y * C.cell + C.cell / 2 });
      return { kind: 'scratch', todo: this.flow.over ? [] : todo };
    };

    void (async () => {
      await this.flow.intro('scratch-before', 'line-guide-scratch');
      this.started = true;
      this.drawCursor();
    })();
  }

  private rubAt(px: number, py: number) {
    if (!this.started || this.flow.over) return;
    const x = (px - C.origin[0]) / C.cell - 0.5;
    const y = (py - C.origin[1]) / C.cell - 0.5;
    if (x < -2 || y < -2 || x > C.cols + 1 || y > C.rows + 1) return;
    this.rub(x, y);
  }

  private rub(x: number, y: number) {
    if (this.flow.over) return;
    if (this.field.rub(x, y, C.brush) === 0) return;
    this.redrawDirt();
    this.drawCursor();
    if (this.field.ratio() >= SCRATCH_DONE) {
      this.dirt.clear();
      this.cursorBox.clear();
      this.drawArrow();
      void this.flow.finish('scratch-after');
    }
  }

  private redrawDirt() {
    const g = this.dirt.clear();
    for (let y = 0; y < C.rows; y++)
      for (let x = 0; x < C.cols; x++) {
        if (this.field.isCleared(x, y)) continue;
        const px = C.origin[0] + x * C.cell;
        const py = C.origin[1] + y * C.cell;
        g.fillStyle((x * 73 + y * 151 + ((x * y) % 7)) % 11 === 0 ? DIRT_DOT : DIRT).fillRect(px, py, C.cell, C.cell);
      }
  }

  private drawCursor() {
    if (!this.started) return;
    const px = C.origin[0] + this.brush.x * C.cell;
    const py = C.origin[1] + this.brush.y * C.cell;
    this.cursorBox.clear().lineStyle(1, CURSOR).strokeRect(px - C.cell + 0.5, py - C.cell + 0.5, C.cell * 3 - 1, C.cell * 3 - 1);
  }

  /** Rock face with parallel scratches running along the ice-flow direction. */
  private drawRock() {
    const g = this.add.graphics();
    g.fillStyle(0x2a2f36).fillRect(0, 0, VIEW_W, VIEW_H);
    const w = C.cols * C.cell;
    const h = C.rows * C.cell;
    const [ox, oy] = C.origin;
    if (this.textures.exists('minigames/scratch')) this.add.image(0, 0, 'minigames/scratch').setOrigin(0);
    else {
      g.fillStyle(ROCK).fillRect(ox, oy, w, h);
      for (let i = 0; i < 30; i++) g.fillStyle(ROCK_DARK).fillRect(ox + ((i * 53) % w), oy + ((i * 37) % h), 6, 3);
    }
    const [ax, ay] = C.arrow.from;
    const [bx, by] = C.arrow.to;
    const len = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    const s = this.add.graphics().setDepth(5);
    s.fillStyle(SCRATCH);
    // scratches: short parallel dashes, drawn pixel by pixel so they stay crisp
    for (let k = 0; k < 14; k++) {
      const off = (k - 7) * 10;
      const sx = ax + -uy * off + ((k * 31) % 40);
      const sy = ay + ux * off;
      for (let t = 0; t < 120 + ((k * 17) % 60); t += 1) {
        const x = Math.round(sx + ux * t);
        const y = Math.round(sy + uy * t);
        if (x > ox && x < ox + w - 1 && y > oy && y < oy + h - 1) s.fillRect(x, y, 1, 1);
      }
    }
  }

  private drawArrow() {
    const [ax, ay] = C.arrow.from;
    const [bx, by] = C.arrow.to;
    const g = this.add.graphics().setDepth(30);
    const len = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    g.fillStyle(ARROW);
    for (let t = 0; t < len; t++) g.fillRect(Math.round(ax + ux * t) - 1, Math.round(ay + uy * t) - 1, 3, 3);
    for (let t = 0; t < 12; t++)
      for (const side of [-1, 1]) {
        const x = bx - ux * t + -uy * t * 0.8 * side;
        const y = by - uy * t + ux * t * 0.8 * side;
        g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      }
  }
}
