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

  /** Cross-section: sky band, sea, a ridge rising in the middle, and the rock record below. */
  private drawSection() {
    if (this.textures.exists('minigames/survey')) {
      this.add.image(0, 0, 'minigames/survey').setOrigin(0);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x9ab8d0).fillRect(0, 0, VIEW_W, SURFACE_Y);
      g.fillStyle(0x274660).fillRect(0, SURFACE_Y, VIEW_W, VIEW_H - SURFACE_Y);
      g.fillStyle(0x1d3448).fillRect(0, C.floorTop, VIEW_W, VIEW_H - C.floorTop);
      // ridge
      g.fillStyle(0x3a4a5a);
      for (let x = 0; x < VIEW_W; x++) {
        const d = Math.abs(x - RIDGE_X);
        const hgt = Math.max(0, 40 - d * 0.35);
        g.fillRect(x, C.floorTop - hgt, 1, hgt + 44);
      }
      g.fillStyle(0x14202c).fillRect(0, C.floorTop + 44, VIEW_W, 56);
    }
    const r = this.add.graphics().setDepth(6);
    r.fillStyle(0xd9483b).fillRect(RIDGE_X - 1, C.floorTop - 44, 2, 6);
    this.add
      .text(RIDGE_X, C.floorTop - 46, this.ui.line('line-label-ridge'), { fontFamily: 'Galmuri11', fontSize: '12px', color: '#ff8a7a' })
      .setOrigin(0.5, 1)
      .setDepth(6);
  }
}
