import Phaser from 'phaser';
import { dbg, enterScene } from '../../common/debug';
import { findPath, type Cell } from '../../common/grid';
import { artOr } from '../../common/greybox';
import { FONT, type Pt } from '../../common/layout';
import { VIEW_H, VIEW_W } from '../../common/screen';
import { UI_KEY, type UiScene } from '../../common/UiScene';
import { worldPieces } from '../data';
import { TOWN_OF_PORT, type PortId, type Run } from '../run';
import { PORTS, SAIL_SPEED, SEA, SEA_CELL, cellCenter, nearestSea, portCell, toCell } from '../sea';

export interface SailData {
  /** Sail by hand toward this port. */
  to?: PortId;
  /** Glide back to Hamburg with no steering (after a field trip). */
  returnFrom?: PortId;
}

const SEA_COLOR = 0x274660;
const SEA_GRID = 0x2d506c;
const RETURN_SECONDS = 4;
const ARRIVE_PX = 7;

/** The 1920s world map: steer a ship from port to port across today's oceans. */
export class SailScene extends Phaser.Scene {
  private run!: Run;
  private ui!: UiScene;
  private ship!: Phaser.GameObjects.Image;
  private pos: Pt = { x: 0, y: 0 };
  private path: Cell[] = [];
  private speed = SAIL_SPEED * SEA_CELL;
  private auto = false;
  private done = false;
  private near: PortId | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super('Sail');
  }

  create(data: SailData) {
    enterScene('Sail', this);
    this.done = false;
    this.path = [];
    this.near = null;
    this.run = this.registry.get('run') as Run;
    this.ui = this.scene.get(UI_KEY) as UiScene;
    this.ui.bind(this);
    this.auto = !!data.returnFrom;

    this.drawMap();
    this.drawPorts();
    const start = data.returnFrom ?? 'hamburg';
    this.pos = cellCenter(portCell(start));
    this.near = start;
    const tex = artOr(this, 'sail/ship', 'gb-ship', 12, 10, (g) => {
      g.fillStyle(0x1b2a38).fillRect(0, 5, 12, 5);
      g.fillStyle(0x6b4f33).fillRect(1, 6, 10, 3);
      g.fillStyle(0xe8dfc6).fillRect(5, 0, 1, 6).fillRect(6, 1, 4, 4);
    });
    this.ship = this.add.image(0, 0, tex).setOrigin(0.5, 0.5).setDepth(500);
    this.placeShip();

    this.cursors = this.input.keyboard!.createCursorKeys();
    if (this.auto) {
      const from = portCell(start);
      const p = findPath(SEA, from, portCell('hamburg'), true) ?? [];
      this.path = p;
      this.speed = Math.max(this.speed, ((p.length + 1) * SEA_CELL) / RETURN_SECONDS);
      this.ui.setGuide('line-sail-return', { done: this.run.evidence() - 1, total: 3 });
    } else {
      this.ui.setGuide(data.to ? `line-goal-sail-${data.to}` : null, { done: this.run.evidence() - 1, total: 3 });
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onTap({ x: p.x, y: p.y }));
    }
    this.events.on('ui-opened', () => (this.path = []));

    dbg.goalPoint = () => {
      const g = this.run.goal;
      if (this.auto || g.kind !== 'sail') return null;
      const [x, y] = PORTS[g.port].at;
      return { x, y };
    };
    dbg.player = () => toCell(this.pos);
  }

  update(_t: number, delta: number) {
    if (this.done) return;
    const step = (this.speed * delta) / 1000;
    if (!this.auto && this.input.enabled) {
      const c = this.cursors;
      const dx = (c.right.isDown ? 1 : 0) - (c.left.isDown ? 1 : 0);
      const dy = (c.down.isDown ? 1 : 0) - (c.up.isDown ? 1 : 0);
      if (dx || dy) {
        this.path = [];
        const k = dx && dy ? Math.SQRT1_2 : 1;
        this.tryMove(dx * step * k, dy * step * k);
      }
    }
    if (this.path.length && (this.auto || this.input.enabled)) {
      let left = step;
      while (left > 0 && this.path.length) {
        const t = cellCenter(this.path[0]);
        const d = Math.hypot(t.x - this.pos.x, t.y - this.pos.y);
        if (d <= left) {
          this.pos = t;
          this.path.shift();
          left -= d;
        } else {
          this.pos = { x: this.pos.x + ((t.x - this.pos.x) / d) * left, y: this.pos.y + ((t.y - this.pos.y) / d) * left };
          left = 0;
        }
      }
    }
    this.placeShip();
    this.checkPorts();
  }

  private tryMove(dx: number, dy: number) {
    const ok = (p: Pt) => {
      const c = toCell(p);
      return SEA.open(c.x, c.y);
    };
    const n = { x: this.pos.x + dx, y: this.pos.y + dy };
    if (ok(n)) this.pos = n;
    else if (ok({ x: n.x, y: this.pos.y })) this.pos = { x: n.x, y: this.pos.y };
    else if (ok({ x: this.pos.x, y: n.y })) this.pos = { x: this.pos.x, y: n.y };
    this.pos.x = Phaser.Math.Clamp(this.pos.x, 2, VIEW_W - 2);
    this.pos.y = Phaser.Math.Clamp(this.pos.y, 24, VIEW_H - 2);
  }

  private onTap(p: Pt) {
    if (this.done || p.y < 22) return;
    const c = toCell(p);
    const target = SEA.open(c.x, c.y) ? c : nearestSea(p);
    if (!target) return;
    const from = toCell(this.pos);
    const path = findPath(SEA, from, target, true);
    if (path) this.path = path;
  }

  private checkPorts() {
    let near: PortId | null = null;
    for (const id of Object.keys(PORTS) as PortId[]) {
      const [x, y] = PORTS[id].at;
      if (Math.hypot(x - this.pos.x, y - this.pos.y) <= ARRIVE_PX) near = id;
    }
    // Sailing past a port already visited does not stop the ship; stopping there does.
    const c = this.cursors;
    const steering = this.path.length > 0 || c.left.isDown || c.right.isDown || c.up.isDown || c.down.isDown;
    if (near && near === this.near) return;
    if (near && !this.auto && this.run.portStatus(near) === 'visited' && steering) return;
    if (near === this.near) return;
    this.near = near;
    if (!near) return;
    if (this.auto) {
      if (near === 'hamburg') this.finish(() => this.scene.start('Town', { town: 'lab', at: 'port' }));
      return;
    }
    const status = this.run.portStatus(near);
    if (status === 'next') {
      this.run.complete('sail');
      this.ui.sfx('done');
      this.finish(() =>
        near === 'newyork' ? this.scene.start('Debate') : this.scene.start('Town', { town: TOWN_OF_PORT[near], at: 'port' }),
      );
    } else if (status === 'visited' && near !== 'hamburg') {
      this.path = [];
      void this.ui.say('sail-visited');
    }
  }

  private finish(go: () => void) {
    this.done = true;
    this.path = [];
    this.time.delayedCall(250, go);
  }

  private placeShip() {
    const x = Math.round(this.pos.x);
    if (x !== Math.round(this.ship.x)) this.ship.setFlipX(x < this.ship.x);
    this.ship.setPosition(x, Math.round(this.pos.y));
  }

  private drawMap() {
    if (this.textures.exists('sail/sea')) this.add.image(0, 0, 'sail/sea').setOrigin(0);
    else {
      const g = this.add.graphics();
      g.fillStyle(SEA_COLOR).fillRect(0, 0, VIEW_W, VIEW_H);
      g.fillStyle(SEA_GRID);
      for (let x = 0; x < VIEW_W; x += 40) g.fillRect(x, 0, 1, VIEW_H);
      for (let y = 22; y < VIEW_H; y += 40) g.fillRect(0, y, VIEW_W, 1);
    }
    for (const s of worldPieces()) {
      this.add.image(s.start.x, s.start.y, s.tex).setOrigin(0).setTint(s.color);
      this.add.image(s.start.x, s.start.y, s.outlineTex).setOrigin(0).setTint(0x1b2a38);
    }
  }

  private drawPorts() {
    const style = { fontFamily: FONT.family, fontSize: `${FONT.sizePx}px`, color: '#f4ecd8', backgroundColor: '#121a28', padding: { x: 2, y: 1 } };
    const blinkers: Phaser.GameObjects.Graphics[] = [];
    for (const id of Object.keys(PORTS) as PortId[]) {
      const status = this.auto ? (id === 'hamburg' ? 'next' : 'closed') : this.run.portStatus(id);
      if (status === 'closed') continue;
      const [x, y] = PORTS[id].at;
      const g = this.add.graphics().setDepth(400);
      g.fillStyle(0x121a28).fillRect(x - 3, y - 3, 6, 6);
      g.fillStyle(status === 'next' ? 0xffd23f : 0x9aa6b8).fillRect(x - 2, y - 2, 4, 4);
      if (status === 'next') blinkers.push(g);
      const right = PORTS[id].side ? PORTS[id].side === 'right' : x < VIEW_W - 80;
      this.add
        .text(x + (right ? 6 : -6), PORTS[id].side === 'left' ? y - 12 : y, this.ui.line(PORTS[id].label), style)
        .setOrigin(right ? 0 : 1, 0.5)
        .setDepth(400)
        .setAlpha(status === 'next' ? 1 : 0.7);
    }
    let on = true;
    this.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        on = !on;
        for (const b of blinkers) b.setAlpha(on ? 1 : 0.3);
      },
    });
  }
}
