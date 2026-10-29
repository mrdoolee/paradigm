import Phaser from 'phaser';
import { bindActions } from '../../common/actions';
import { dbg, enterScene } from '../../common/debug';
import { artOr } from '../../common/greybox';
import { VIEW_H, VIEW_W } from '../../common/screen';
import { UI_KEY, type UiScene } from '../../common/UiScene';
import config from '../../../../activities/continental-drift/minigames.json';
import seafloor from '../../../../activities/continental-drift/art/seafloor/seafloor.json';
import { SURVEY_DONE, SurveyTrack, stripeAt } from '../minigames/logic';
import type { Run } from '../run';

const C = config.survey;
const SCALE = 2;
const RIDGE_X = VIEW_W / 2;
const HALF = seafloor.stripes.reduce((a, b) => a + b, 0) * SCALE;
const X0 = RIDGE_X - HALF;
const X1 = RIDGE_X + HALF;
const SPEED = 70; // px per second
const NORMAL = 0xe0a040;
const REVERSED = 0xf2ecdc;
const SURFACE_Y = 52;

/**
 * Thirty years later: steer a survey ship across the mid-ocean ridge. Under its track the
 * magnetic record of the sea floor appears, the same stripes the table puzzle uses.
 */
export class SurveyScene extends Phaser.Scene {
  private track!: SurveyTrack;
  private ui!: UiScene;
  private run!: Run;
  private ship!: Phaser.GameObjects.Image;
  private x = X0;
  private target: number | null = null;
  private paint!: Phaser.GameObjects.Graphics;
  private started = false;
  private over = false;
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super('Survey');
  }

  create() {
    enterScene('Survey', this);
    this.started = false;
    this.over = false;
    this.x = X0;
    this.target = null;
    this.ui = this.scene.get(UI_KEY) as UiScene;
    this.ui.bind(this);
    this.run = this.registry.get('run') as Run;
    this.track = new SurveyTrack(X0, X1);
    this.drawSection();
    this.paint = this.add.graphics().setDepth(5);
    const tex = artOr(this, 'sail/survey-ship', 'gb-survey-ship', 24, 14, (g) => {
      g.fillStyle(0x1b2a38).fillRect(0, 7, 24, 7);
      g.fillStyle(0xd8dde4).fillRect(1, 8, 22, 4);
      g.fillStyle(0xd9483b).fillRect(8, 2, 8, 6);
    });
    this.ship = this.add.image(0, SURFACE_Y, tex).setOrigin(0.5, 1).setDepth(10);
    this.cable = this.add.graphics().setDepth(9);
    this.placeShip();

    this.keys = this.input.keyboard!.createCursorKeys();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.started && (this.target = p.x));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.started && p.isDown && (this.target = p.x));
    bindActions(this, () => {});

    dbg.minigame = () => {
      const gap = this.track.firstGap();
      const tx = gap === null ? null : gap < this.x ? Math.max(X0, gap - 8) : Math.min(X1, gap + 8);
      return { kind: 'survey', todo: this.over || tx === null ? [] : [{ x: tx, y: C.trackY }] };
    };

    void (async () => {
      await this.ui.say('survey-before');
      this.ui.setGuide('line-guide-survey');
      this.started = true;
    })();
  }

  private cable!: Phaser.GameObjects.Graphics;

  update(_t: number, delta: number) {
    if (!this.started || this.over || !this.input.enabled) return;
    const step = (SPEED * delta) / 1000;
    const dir = (this.keys.right.isDown ? 1 : 0) - (this.keys.left.isDown ? 1 : 0);
    const before = this.x;
    if (dir) {
      this.target = null;
      this.x += dir * step;
    } else if (this.target !== null) {
      const d = this.target - this.x;
      this.x += Math.sign(d) * Math.min(Math.abs(d), step);
      if (Math.abs(d) <= step) this.target = null;
    }
    this.x = Phaser.Math.Clamp(this.x, X0 - 20, X1 + 20);
    if (this.x !== before) {
      this.track.mark(before, this.x);
      this.drawStripes(Math.min(before, this.x), Math.max(before, this.x));
      this.placeShip();
    }
    if (this.track.coverage() >= SURVEY_DONE) void this.finish();
  }

  private async finish() {
    if (this.over) return;
    this.over = true;
    // fill any thin gaps so the record reads as whole stripes
    this.drawStripes(X0, X1);
    this.ui.setGuide(null);
    this.ui.sfx('done');
    await new Promise<void>((r) => this.time.delayedCall(400, r));
    await this.ui.say('survey-after');
    this.run.complete('survey');
    this.scene.start('Puzzle', { phases: ['stripes'], next: 'Ending' });
  }

  private placeShip() {
    this.ship.setX(Math.round(this.x));
    this.cable.clear().fillStyle(0x9aa6b8);
    if (this.textures.exists('sail/survey-ship')) return; // the art already trails its cable
    for (let t = 0; t < 30; t++) this.cable.fillRect(Math.round(this.x - 12 - t), SURFACE_Y - 2 + Math.floor(t / 6), 1, 1);
  }

  private drawStripes(a: number, b: number) {
    const top = C.floorTop + 44;
    const h = 56;
    for (let x = Math.floor(Math.max(a, X0)); x < Math.ceil(Math.min(b, X1)); x++) {
      const pol = stripeAt((x + 0.5 - RIDGE_X) / SCALE, seafloor.stripes);
      this.paint.fillStyle(pol === 'normal' ? NORMAL : REVERSED).fillRect(x, top, 1, h);
    }
  }

  /**
   * Cross-section drawn pixel by pixel: sky, sea, the ridge under water with a small valley on its
   * axis, then the layers of the ocean floor (sediment that thickens away from the ridge, pillow
   * basalt, sheeted dikes, gabbro) over the mantle, and magma rising under the ridge. The magnetic
   * record is painted later inside the basalt band.
   */
  private drawSection() {
    if (this.textures.exists('minigames/survey')) {
      this.add.image(0, 0, 'minigames/survey').setOrigin(0);
    } else {
      if (!this.textures.exists(SECTION_KEY)) this.buildSection();
      this.add.image(0, 0, SECTION_KEY).setOrigin(0);
    }
    const r = this.add.graphics().setDepth(6);
    const top = ridgeTop(RIDGE_X);
    r.fillStyle(0xd9483b).fillRect(RIDGE_X - 1, top - 10, 2, 6);
    const label = { fontFamily: 'Galmuri11', fontSize: '12px', color: '#e8dfc6', backgroundColor: '#121a28', padding: { x: 2, y: 1 } };
    this.add.text(RIDGE_X, top - 12, this.ui.line('line-label-ridge'), label).setOrigin(0.5, 1).setDepth(6);
    // layer names on the left, away from the ship's track
    const left = (y: number, anchor: string) => this.add.text(4, y, this.ui.line(anchor), { ...label, color: '#c8bfa8' }).setOrigin(0, 0.5).setDepth(6);
    left(ridgeTop(8) + sedimentAt(8) / 2 + 1, 'line-label-sediment');
    left(BAND_BOTTOM + 14, 'line-label-crust');
    left(MANTLE_TOP + 30, 'line-label-mantle');
  }

  private buildSection() {
    const tex = this.textures.createCanvas(SECTION_KEY, VIEW_W, VIEW_H)!;
    const ctx = tex.getContext();
    const img = ctx.createImageData(VIEW_W, VIEW_H);
    for (let y = 0; y < VIEW_H; y++)
      for (let x = 0; x < VIEW_W; x++) {
        const c = sectionColor(x, y);
        const i = (y * VIEW_W + x) * 4;
        img.data[i] = (c >> 16) & 255;
        img.data[i + 1] = (c >> 8) & 255;
        img.data[i + 2] = c & 255;
        img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
    tex.refresh();
  }
}

// ---- the cross-section, as pure functions of the pixel ------------------------

const SECTION_KEY = 'gb-survey-section';
const BAND_TOP = C.floorTop + 44;
const BAND_BOTTOM = BAND_TOP + 56;
const DIKES_BOTTOM = BAND_BOTTOM + 16;
const MANTLE_TOP = DIKES_BOTTOM + 22;

/** Fixed hash noise in 0..1 (same every run). */
function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth 1D noise for gentle bumps on the sea floor. */
function bumps(x: number): number {
  const a = Math.floor(x / 12);
  const t = (x / 12) - a;
  const s = t * t * (3 - 2 * t);
  return hash(a, 7) * (1 - s) + hash(a + 1, 7) * s;
}

/** Top of the rock (sea floor) at column x: a broad ridge, abyssal hills, and a small valley on the axis. */
export function ridgeTop(x: number): number {
  const d = Math.abs(x - RIDGE_X);
  const rise = Math.max(0, 40 - d * 0.3) + (d < 60 ? (60 - d) * 0.08 : 0);
  const valley = d < 7 ? (7 - d) * 0.8 : 0;
  return Math.round(C.floorTop - rise + valley + bumps(x) * 4 - 2);
}

/** Sediment thickness: none on the ridge axis, thicker farther away (older floor). */
export function sedimentAt(x: number): number {
  const d = Math.abs(x - RIDGE_X);
  return Math.max(0, Math.round((d - 24) / 18));
}

function dither(y: number, edge: number, x: number, a: number, b: number): number {
  // two-row checker step between bands instead of a gradient
  if (y < edge - 1) return a;
  if (y > edge) return b;
  return (x + y) % 2 === 0 ? a : b;
}

function sectionColor(x: number, y: number): number {
  const floor = ridgeTop(x);
  if (y < SURFACE_Y) {
    // sky with two flat pixel clouds
    const cloud = (cx: number, cy: number, w: number) => Math.abs(y - cy) <= 2 && Math.abs(x - cx) < w - Math.abs(y - cy) * 3;
    if (cloud(110, 22, 22) || cloud(330, 14, 16) || cloud(420, 30, 12)) return 0xd8e4ee;
    return dither(y, 30, x, 0x8fb0cc, 0x9ab8d0);
  }
  if (y < floor) {
    if (y === SURFACE_Y && (x % 24) < 6) return 0x9ab8d0; // wave marks
    let c = dither(y, SURFACE_Y + 10, x, 0x3a6a8a, 0x2d5a78);
    if (y > SURFACE_Y + 11) c = dither(y, SURFACE_Y + 34, x, 0x2d5a78, 0x274660);
    if (y > SURFACE_Y + 35) c = dither(y, C.floorTop - 10, x, 0x274660, 0x1f3b55);
    return c;
  }
  const d = Math.abs(x - RIDGE_X);
  const n = hash(x, y);
  // magma rising under the ridge axis
  const conduit = 3 + Math.round(bumps(y * 2) * 3) + Math.max(0, Math.round((y - MANTLE_TOP) / 6));
  if (y > floor + 2 && d <= conduit && y >= BAND_BOTTOM) return n < 0.25 ? 0xf0a050 : 0xd9683b;
  // a thin feeder up through the crust to the valley on the axis
  if (y > floor + 2 && y < BAND_TOP && d <= (y > floor + 12 ? 1 : 0)) return 0xd9683b;
  if (y >= MANTLE_TOP) {
    const glow = d < 40 + (y - MANTLE_TOP) * 0.6 + (hash(y, 3) - 0.5) * 10 ? 0x7a4a36 : 0x5e3a2e;
    return n < 0.08 ? 0x8a5a42 : n < 0.16 ? 0x4a2e26 : glow;
  }
  if (y >= DIKES_BOTTOM) return n < 0.12 ? 0x4e5660 : n < 0.2 ? 0x262c34 : 0x353c46; // gabbro
  if (y >= BAND_BOTTOM) return (x + Math.floor(y / 8)) % 5 === 0 ? 0x262c34 : n < 0.1 ? 0x4e5660 : 0x3e4652; // sheeted dikes
  const sed = sedimentAt(x);
  if (y < floor + sed) {
    // sediment: thin flat layers with grains
    const layer = (y - floor) % 2 === 0 ? 0xb8a27a : 0xa48e68;
    return n < 0.1 ? 0x8c7854 : layer;
  }
  // pillow basalt: rounded blobs in staggered rows, dark rims, a light spot top-left
  const row = Math.floor((y - floor) / 7);
  const off = row % 2 === 0 ? 0 : 6;
  const px = (x + off) % 12;
  const py = (y - floor) % 7;
  const e = ((px - 5.5) / 6) ** 2 + ((py - 3) / 3.6) ** 2;
  if (e > 0.78) return 0x262c34;
  if (px >= 2 && px <= 4 && py >= 1 && py <= 2) return 0x5c6672;
  return n < 0.06 ? 0x4e5660 : 0x404854;
}
