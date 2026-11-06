import Phaser from 'phaser';
import { findPath, type Cell, type Grid } from './grid';
import type { Pt } from '../engine/layout';

export type Dir = 'up' | 'down' | 'left' | 'right';
export const STEP_MS = 110;
/**
 * Places the sprite shows during one cell step. Fewer than the screen's frame rate on purpose:
 * the character hops 4 art pixels at a time (16px cell / 4) like a classic RPG, not a smooth glide.
 */
export const WALK_FRAMES = 4;
const DELTA: Record<Dir, Cell> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

/**
 * A character that walks a tile grid one whole cell at a time (classic RPG style).
 * It always ends a move standing on a cell; a new target mid-walk takes effect at the next cell.
 */
export class Walker {
  private _cell: Cell;
  facing: Dir = 'down';
  private path: Cell[] = [];
  private from: Pt;
  private to: Pt | null = null;
  private t = 0;
  private onArrive: (() => void) | null = null;
  readonly events = new Phaser.Events.EventEmitter();

  constructor(
    private grid: Grid,
    cell: Cell,
    private origin: Pt,
    private tile: number,
    readonly sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
  ) {
    this._cell = { ...cell };
    this.from = this.px(cell);
    this.place(this.from);
  }

  get cell(): Cell {
    return { ...this._cell };
  }

  get moving(): boolean {
    return this.to !== null;
  }

  /** Pixel position of a cell's top-left corner. */
  px(c: Cell): Pt {
    return { x: this.origin.x + c.x * this.tile, y: this.origin.y + c.y * this.tile };
  }

  /** Walks to `target` along the grid. Returns false if it cannot be reached. */
  walkTo(target: Cell, onArrive: () => void): boolean {
    const startFrom = this.to ? this.nextCell() : this._cell;
    const p = findPath(this.grid, startFrom, target);
    if (!p) return false;
    this.onArrive = onArrive;
    if (this.to) {
      // finish the current step, then follow the new path
      this.path = p;
      return true;
    }
    this.path = p;
    if (p.length === 0) this.arrive();
    else this.beginStep();
    return true;
  }

  /** One step in a direction; if blocked, only turns to face it. */
  step(dir: Dir): void {
    if (this.to) return;
    this.facing = dir;
    this.onArrive = null;
    const d = DELTA[dir];
    const n = { x: this._cell.x + d.x, y: this._cell.y + d.y };
    this.events.emit('face', dir);
    if (!this.grid.open(n.x, n.y)) return;
    this.path = [n];
    this.beginStep();
  }

  facingCell(): Cell {
    const d = DELTA[this.facing];
    return { x: this._cell.x + d.x, y: this._cell.y + d.y };
  }

  face(target: Cell): void {
    const dx = target.x - this._cell.x;
    const dy = target.y - this._cell.y;
    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) this.facing = dx > 0 ? 'right' : 'left';
    else if (dy !== 0) this.facing = dy > 0 ? 'down' : 'up';
    this.events.emit('face', this.facing);
  }

  /** Drops the rest of the path; the current step still finishes on a cell. */
  stop(): void {
    this.path = [];
    this.onArrive = null;
  }

  update(delta: number): void {
    if (!this.to) return;
    this.t += delta;
    const k = Math.min(1, this.t / STEP_MS);
    const shown = Math.floor(k * WALK_FRAMES) / WALK_FRAMES;
    this.place({ x: this.from.x + (this.to.x - this.from.x) * shown, y: this.from.y + (this.to.y - this.from.y) * shown });
    if (k < 1) return;
    this._cell = this.nextCell();
    this.from = this.to;
    this.to = null;
    if (this.path.length) this.beginStep();
    else this.arrive();
  }

  private nextCell(): Cell {
    return {
      x: Math.round((this.to!.x - this.origin.x) / this.tile),
      y: Math.round((this.to!.y - this.origin.y) / this.tile),
    };
  }

  private beginStep() {
    const n = this.path.shift()!;
    if (!this.grid.open(n.x, n.y)) {
      this.path = [];
      this.arrive();
      return;
    }
    this.face(n);
    this.to = this.px(n);
    this.t = 0;
    this.events.emit('step');
  }

  private arrive() {
    const cb = this.onArrive;
    this.onArrive = null;
    this.events.emit('arrive', this.cell);
    cb?.();
  }

  private place(p: Pt) {
    this.sprite.setPosition(Math.round(p.x), Math.round(p.y));
  }
}
