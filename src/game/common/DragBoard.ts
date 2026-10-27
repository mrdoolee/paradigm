import Phaser from 'phaser';
import { bindActions } from './actions';
import { KEY_STEP, SNAP_RADIUS, type Pt, type Rect } from './layout';
import { clampToArea, snapSteps, trySnap } from './snap';

export interface PieceSpec {
  id: string;
  w: number;
  h: number;
  start: Pt;
  target: Pt;
  fixed?: boolean;
  tex: string;
  outlineTex: string;
  dottedTex: string;
  /** Pattern name -> texture key. */
  layers: Record<string, string>;
  /** Grey-box land colour. Ignored once real art replaces the white mask. */
  color: number;
}

interface Piece {
  spec: PieceSpec;
  box: Phaser.GameObjects.Container;
  land: Phaser.GameObjects.Image;
  rim: Phaser.GameObjects.Image;
  layers: Record<string, Phaser.GameObjects.Image>;
  dotted: Phaser.GameObjects.Image;
  pos: Pt;
  snapped: boolean;
  moving: boolean;
}

const RIM_ACTIVE = 0xfff6c8;
const RIM_SELECTED = 0xffd23f;
const RIM_IDLE = 0x1b2a38;
const STEP_MS = 40;

/**
 * Drag-to-fit board. Each piece is a Container (land + pattern layers + rim)
 * moved in whole pixels. Only the current phase's pieces can move.
 */
export class DragBoard {
  readonly events = new Phaser.Events.EventEmitter();
  private pieces = new Map<string, Piece>();
  private movable: string[] = [];
  private enabled = true;
  private drag: { id: string; dx: number; dy: number } | null = null;
  private selected: string | null = null;
  private blink = 0;

  constructor(private scene: Phaser.Scene, specs: PieceSpec[], private area: Rect) {
    for (const spec of specs) {
      const land = scene.add.image(0, 0, spec.tex).setOrigin(0).setTint(spec.color);
      const layers: Record<string, Phaser.GameObjects.Image> = {};
      for (const [name, key] of Object.entries(spec.layers)) {
        layers[name] = scene.add.image(0, 0, key).setOrigin(0).setVisible(false);
      }
      const rim = scene.add.image(0, 0, spec.outlineTex).setOrigin(0).setTint(RIM_IDLE);
      const pos = spec.fixed ? { ...spec.target } : { ...spec.start };
      const box = scene.add.container(pos.x, pos.y, [land, ...Object.values(layers), rim]);
      const dotted = scene.add
        .image(spec.target.x, spec.target.y, spec.dottedTex)
        .setOrigin(0)
        .setTint(RIM_ACTIVE)
        .setVisible(false)
        .setDepth(900);
      const piece: Piece = { spec, box, land, rim, layers, dotted, pos, snapped: !!spec.fixed, moving: false };
      this.pieces.set(spec.id, piece);
      if (!spec.fixed) {
        land.setInteractive(scene.input.makePixelPerfect());
        land.on('pointerdown', (p: Phaser.Input.Pointer) => this.onDown(piece, p));
      }
    }
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onMove(p));
    scene.input.on('pointerup', () => this.onUp());
    scene.input.on('pointerupoutside', () => this.onUp());
    bindActions(scene, (a) => {
      if (!this.enabled) return;
      if (a === 'cycle') this.cycle();
      else if (a === 'confirm') this.dropSelected();
      else if (a === 'left' || a === 'right' || a === 'up' || a === 'down') this.nudge(a);
    });
    const timer = scene.time.addEvent({ delay: 250, loop: true, callback: () => this.tickBlink() });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      timer.remove();
      this.events.removeAllListeners();
    });
  }

  /** Makes `movable` the current phase and shows `pattern` on every piece that has it. */
  setPhase(movable: string[], pattern: string | null): void {
    this.movable = movable.filter((id) => !this.pieces.get(id)?.snapped);
    this.selected = null;
    let depth = 0;
    for (const p of this.pieces.values()) {
      const active = movable.includes(p.spec.id);
      for (const [name, img] of Object.entries(p.layers)) img.setVisible(name === pattern);
      p.box.setAlpha(active ? 1 : p.snapped ? 0.75 : 0.4);
      p.box.setDepth(active ? 100 + depth : depth);
      depth++;
    }
    this.refreshRims();
    if (this.movable.length === 0) this.scene.time.delayedCall(0, () => this.events.emit('phase-done'));
  }

  /** Shows every piece at full strength with no highlight (for cut-scenes). */
  showAll(): void {
    this.movable = [];
    for (const p of this.pieces.values()) p.box.setAlpha(1);
    this.refreshRims();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.onUp(true);
  }

  info(id: string): { pos: Pt; target: Pt; snapped: boolean; size: { w: number; h: number } } | null {
    const p = this.pieces.get(id);
    return p ? { pos: { ...p.pos }, target: { ...p.spec.target }, snapped: p.snapped, size: { w: p.spec.w, h: p.spec.h } } : null;
  }

  /** A land pixel near the middle of the piece (for tests that press on the shape). */
  grabOffset(id: string): Pt | null {
    const p = this.pieces.get(id);
    if (!p) return null;
    const cx = Math.floor(p.spec.w / 2);
    const cy = Math.floor(p.spec.h / 2);
    for (let r = 0; r < Math.max(p.spec.w, p.spec.h); r++) {
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 1 || y < 1 || x >= p.spec.w - 1 || y >= p.spec.h - 1) continue;
          const solid = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].every(
            ([ox, oy]) => (this.scene.textures.getPixelAlpha(x + ox, y + oy, p.spec.tex) ?? 0) > 0,
          );
          if (solid) return { x: x + 0.5, y: y + 0.5 };
        }
    }
    return null;
  }

  movableIds(): string[] {
    return this.movable.filter((id) => !this.pieces.get(id)!.snapped);
  }

  /** All pieces' rims flash `times` times (used for the "one landmass" moment). */
  flashAll(times: number, done: () => void): void {
    let n = 0;
    const tick = () => {
      const on = n % 2 === 0;
      for (const p of this.pieces.values()) p.rim.setTint(on ? RIM_ACTIVE : RIM_IDLE);
      n++;
      if (n < times * 2) this.scene.time.delayedCall(250, tick);
      else {
        this.refreshRims();
        done();
      }
    };
    tick();
  }

  /** Moves pieces to the given positions in whole-pixel steps (no dragging involved). */
  moveAll(dest: Record<string, Pt>, steps: number, done: () => void): void {
    const ids = Object.keys(dest).filter((id) => this.pieces.has(id));
    let left = ids.length;
    if (!left) return done();
    for (const id of ids) {
      this.animate(this.pieces.get(id)!, dest[id], steps, () => {
        if (--left === 0) done();
      });
    }
  }

  private canMove(p: Piece): boolean {
    return this.enabled && !p.snapped && !p.moving && this.movable.includes(p.spec.id);
  }

  private onDown(p: Piece, ptr: Phaser.Input.Pointer) {
    if (!this.canMove(p) || this.drag) return;
    this.drag = { id: p.spec.id, dx: ptr.x - p.pos.x, dy: ptr.y - p.pos.y };
    this.selected = p.spec.id;
    p.box.setDepth(500);
    this.refreshRims();
  }

  private onMove(ptr: Phaser.Input.Pointer) {
    if (!this.drag || !this.enabled) return;
    const p = this.pieces.get(this.drag.id)!;
    this.place(p, { x: Math.round(ptr.x - this.drag.dx), y: Math.round(ptr.y - this.drag.dy) });
  }

  private onUp(cancel = false) {
    if (!this.drag) return;
    const p = this.pieces.get(this.drag.id)!;
    this.drag = null;
    p.box.setDepth(200);
    if (!cancel) this.drop(p);
  }

  private place(p: Piece, to: Pt) {
    p.pos = clampToArea(to, { w: p.spec.w, h: p.spec.h }, this.area);
    p.box.setPosition(p.pos.x, p.pos.y);
  }

  private drop(p: Piece) {
    const hit = trySnap(p.pos, p.spec.target, SNAP_RADIUS);
    if (!hit) return;
    p.snapped = true;
    if (this.selected === p.spec.id) this.selected = null;
    this.animate(p, hit, 3, () => {
      p.box.setAlpha(1);
      this.refreshRims();
      this.events.emit('snap', p.spec.id);
      if (this.movableIds().length === 0) this.events.emit('phase-done');
    });
    this.refreshRims();
  }

  private animate(p: Piece, to: Pt, steps: number, done: () => void) {
    p.moving = true;
    const path = snapSteps(p.pos, to, steps);
    let i = 0;
    const step = () => {
      p.pos = path[i];
      p.box.setPosition(p.pos.x, p.pos.y);
      i++;
      if (i < path.length) this.scene.time.delayedCall(STEP_MS, step);
      else {
        p.moving = false;
        done();
      }
    };
    step();
  }

  private cycle() {
    const ids = this.movableIds();
    if (!ids.length) return;
    const i = this.selected ? ids.indexOf(this.selected) : -1;
    this.selected = ids[(i + 1) % ids.length];
    this.pieces.get(this.selected)!.box.setDepth(400);
    this.refreshRims();
  }

  private nudge(dir: 'left' | 'right' | 'up' | 'down') {
    if (!this.selected) this.cycle();
    if (!this.selected) return;
    const p = this.pieces.get(this.selected)!;
    if (!this.canMove(p)) return;
    const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
    this.place(p, { x: p.pos.x + d[0] * KEY_STEP, y: p.pos.y + d[1] * KEY_STEP });
  }

  private dropSelected() {
    if (!this.selected) return;
    const p = this.pieces.get(this.selected)!;
    if (this.canMove(p)) this.drop(p);
  }

  private refreshRims() {
    for (const p of this.pieces.values()) {
      const active = this.movable.includes(p.spec.id) && !p.snapped;
      p.rim.setTint(p.spec.id === this.selected ? RIM_SELECTED : active ? RIM_ACTIVE : RIM_IDLE);
      p.dotted.setVisible(active && this.blink % 2 === 0);
    }
  }

  private tickBlink() {
    this.blink++;
    for (const p of this.pieces.values()) {
      const active = this.movable.includes(p.spec.id) && !p.snapped;
      p.dotted.setVisible(active && this.blink % 2 === 0);
    }
  }
}
