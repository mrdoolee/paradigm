import Phaser from 'phaser';
import type { Script } from '../../script/parse';
import { galmuriMeasure } from '../../script/measure';
import { pagesFor } from '../../script/wrap';
import { NAME_SEP } from '../../script/check';
import { bindActions, type Action } from './actions';
import { dbg } from './debug';
import { DialogQueue, PageCursor } from './dialogQueue';
import {
  BODY,
  CHOICE,
  DIALOG,
  FONT,
  NAME_POS,
  PAGE_MARK_POS,
  PORTRAIT,
  TOPBAR,
} from './layout';

export const UI_KEY = 'Ui';
export type Sfx = 'page' | 'snap' | 'done';

export const UI_COLORS = {
  ink: '#f4ecd8',
  dim: '#9aa6b8',
  accent: '#ffd23f',
  boxFill: 0x121a28,
  boxEdge: 0xe8dfc6,
  boxInner: 0x4b5870,
  barFill: 0x1a2733,
};
const C = UI_COLORS;

const SLIDE_STEP_MS = 40;

/** Draws a two-line pixel frame (outer light, inner dark) on a filled box. */
export function frame(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) {
  g.fillStyle(C.boxFill).fillRect(x, y, w, h);
  g.fillStyle(C.boxEdge);
  g.fillRect(x + 1, y, w - 2, 2).fillRect(x + 1, y + h - 2, w - 2, 2);
  g.fillRect(x, y + 1, 2, h - 2).fillRect(x + w - 2, y + 1, 2, h - 2);
  g.fillStyle(C.boxInner);
  g.fillRect(x + 3, y + 3, w - 6, 1).fillRect(x + 3, y + h - 4, w - 6, 1);
  g.fillRect(x + 3, y + 3, 1, h - 6).fillRect(x + w - 4, y + 3, 1, h - 6);
}

/**
 * The one overlay scene: dialog box, choice box, guide bar and sound toggle.
 * It sits above every world scene and never moves or resizes them.
 */
export class UiScene extends Phaser.Scene {
  private script!: Script;
  private world: Phaser.Scene | null = null;
  private queue = new DialogQueue();
  private soundOn = false;

  private dialog!: Phaser.GameObjects.Container;
  private portrait!: Phaser.GameObjects.Image;
  private portraitBox!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private markText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private pageText!: Phaser.GameObjects.Text;

  private choiceBox!: Phaser.GameObjects.Container;
  private choiceRows: Phaser.GameObjects.Text[] = [];
  private choiceCursor!: Phaser.GameObjects.Text;
  private choiceFrame!: Phaser.GameObjects.Graphics;

  private guideBar!: Phaser.GameObjects.Container;
  private guideText!: Phaser.GameObjects.Text;
  private guideDots!: Phaser.GameObjects.Graphics;
  private guideAnchor: string | null = null;
  private soundIcon!: Phaser.GameObjects.Graphics;

  private onAction: ((a: Action) => void) | null = null;
  private onTap: (() => void) | null = null;

  readonly status = { dialog: false, choice: false, guide: null as string | null };

  constructor() {
    super(UI_KEY);
  }

  setScript(script: Script) {
    this.script = script;
  }

  /** World scenes call this in create() so dialogs can pause their input. */
  bind(world: Phaser.Scene) {
    this.world = world;
    this.scene.bringToTop();
    this.setGuide(null);
  }

  create() {
    dbg.ui = this;
    const ctx = Phaser.Display.Canvas.CanvasPool.create(this, 8, 8).getContext('2d')!;
    ctx.font = `${FONT.sizePx}px ${FONT.family}`;
    dbg.measureCanvas = (s: string) => ctx.measureText(s).width;

    this.buildGuide();
    this.buildDialog();
    this.buildChoice();
    this.buildSoundToggle();

    bindActions(this, (a) => this.onAction?.(a));
    this.input.on('pointerdown', () => this.onTap?.());
  }

  // ---- public API -------------------------------------------------------

  say(anchor: string, opts: { keep?: boolean } = {}): Promise<void> {
    return this.queue.enqueue(() => this.runDialog(anchor, !!opts.keep));
  }

  choose(anchor: string): Promise<string> {
    return this.queue.enqueue(() => this.runChoice(anchor));
  }

  setGuide(anchor: string | null, dots: { done: number; total: number } | null = null) /* done = index of the current step */ {
    this.guideAnchor = anchor;
    const b = anchor ? this.script.blocks.get(anchor) : null;
    this.guideText.setText(b && b.kind === 'line' ? b.text : '');
    const g = this.guideDots.clear();
    if (dots) {
      for (let i = 0; i < dots.total; i++) {
        const x = TOPBAR.w - 30 - (dots.total - 1 - i) * 10;
        // Filled = this step or one already done; hollow = still ahead.
        if (i <= dots.done) g.fillStyle(0xfff6c8).fillRect(x - 3, 8, 6, 6);
        else g.lineStyle(1, 0x8a96a8).strokeRect(x - 2.5, 8.5, 5, 5);
      }
    }
    this.refreshGuide();
  }

  sfx(name: Sfx) {
    if (this.soundOn && this.cache.audio.exists(`sfx-${name}`)) this.sound.play(`sfx-${name}`);
  }

  /** Line text of a `line-*` anchor (title screens use it). */
  line(anchor: string): string {
    const b = this.script.blocks.get(anchor);
    return b && b.kind === 'line' ? b.text : '';
  }

  // ---- building -----------------------------------------------------------

  private text(x: number, y: number, s = '', color = C.ink) {
    return this.add.text(x, y, s, {
      fontFamily: FONT.family,
      fontSize: `${FONT.sizePx}px`,
      color,
      lineSpacing: FONT.lineSpacing,
    });
  }

  private buildGuide() {
    const bg = this.add.graphics();
    bg.fillStyle(C.barFill).fillRect(TOPBAR.x, TOPBAR.y, TOPBAR.w, TOPBAR.h);
    bg.fillStyle(C.boxInner).fillRect(TOPBAR.x, TOPBAR.y + TOPBAR.h - 1, TOPBAR.w, 1);
    this.guideText = this.text(8, 4);
    this.guideDots = this.add.graphics();
    this.guideBar = this.add.container(0, 0, [bg, this.guideText, this.guideDots]).setVisible(false);
  }

  private buildDialog() {
    const g = this.add.graphics();
    frame(g, DIALOG.x, DIALOG.y, DIALOG.w, DIALOG.h);
    this.portraitBox = this.add.graphics();
    this.portrait = this.add.image(PORTRAIT.x, PORTRAIT.y, '__MISSING').setOrigin(0).setVisible(false);
    this.nameText = this.text(NAME_POS.x, NAME_POS.y, '', C.accent);
    this.markText = this.text(NAME_POS.x, NAME_POS.y, '', C.dim);
    this.bodyText = this.text(BODY.x, BODY.y);
    this.pageText = this.text(PAGE_MARK_POS.x, PAGE_MARK_POS.y, '', C.dim).setOrigin(1, 0);
    this.dialog = this.add
      .container(0, 0, [g, this.portraitBox, this.portrait, this.nameText, this.markText, this.bodyText, this.pageText])
      .setVisible(false);
  }

  private buildChoice() {
    this.choiceFrame = this.add.graphics();
    this.choiceCursor = this.text(0, 0, '▶', C.accent);
    this.choiceBox = this.add.container(0, 0, [this.choiceFrame, this.choiceCursor]).setVisible(false);
  }

  private buildSoundToggle() {
    const x = TOPBAR.w - 18;
    this.soundIcon = this.add.graphics();
    const hit = this.add.zone(x - 2, 1, 18, 20).setOrigin(0).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      this.soundOn = !this.soundOn;
      this.drawSoundIcon();
      this.sfx('page');
    });
    this.drawSoundIcon();
  }

  private drawSoundIcon() {
    const x = TOPBAR.w - 18;
    const y = 5;
    const g = this.soundIcon.clear();
    g.fillStyle(this.soundOn ? 0xfff6c8 : 0x6a7688);
    g.fillRect(x, y + 4, 3, 5).fillRect(x + 3, y + 3, 1, 7).fillRect(x + 4, y + 2, 1, 9).fillRect(x + 5, y + 1, 1, 11);
    if (this.soundOn) {
      g.fillRect(x + 8, y + 4, 1, 5).fillRect(x + 10, y + 2, 1, 9);
    } else {
      for (let i = 0; i < 5; i++) {
        g.fillRect(x + 8 + i, y + 4 + i, 1, 1).fillRect(x + 12 - i, y + 4 + i, 1, 1);
      }
    }
  }

  // ---- dialog ---------------------------------------------------------------

  private setWorldInput(on: boolean) {
    if (this.world && this.world.sys.isActive()) {
      this.world.input.enabled = on;
      this.world.events.emit(on ? 'ui-closed' : 'ui-opened');
    }
  }

  private refreshGuide() {
    this.status.guide = this.status.dialog || this.status.choice ? null : this.guideAnchor;
    this.guideBar.setVisible(!!this.status.guide);
  }

  private showSpeaker(speakerId: string) {
    const c = this.script.characters.get(speakerId);
    const name = c?.name ?? '';
    this.nameText.setText(name);
    this.markText.setText(c?.mark && name ? `${NAME_SEP.trimEnd()} ${c.mark}` : '');
    this.markText.setX(NAME_POS.x + galmuriMeasure(name) + 2);
    const key = c?.portrait ? `portrait/${c.portrait}` : null;
    this.portraitBox.clear();
    if (key && this.textures.exists(key)) {
      this.portrait.setTexture(key).setVisible(true);
    } else {
      this.portrait.setVisible(false);
      if (c?.portrait) {
        // Grey-box stand-in until the portrait art exists.
        this.portraitBox.fillStyle(0x2c3a50).fillRect(PORTRAIT.x, PORTRAIT.y, PORTRAIT.w, PORTRAIT.h);
        this.portraitBox.fillStyle(0x5d6f8c).fillRect(PORTRAIT.x + 20, PORTRAIT.y + 10, 24, 24);
        this.portraitBox.fillRect(PORTRAIT.x + 12, PORTRAIT.y + 38, 40, 26);
      }
    }
  }

  private async slideIn() {
    for (const dy of [8, 4, 0]) {
      this.dialog.setY(dy);
      await new Promise((r) => this.time.delayedCall(SLIDE_STEP_MS, r));
    }
  }

  private runDialog(anchor: string, keep: boolean): Promise<void> {
    const block = this.script.blocks.get(anchor);
    if (!block || block.kind !== 'dialogue') return Promise.resolve();
    const pages = block.speeches.map((s) => pagesFor(s.text));
    const cursor = new PageCursor(pages);
    this.status.dialog = true;
    this.refreshGuide();
    this.setWorldInput(false);

    const render = () => {
      const cur = cursor.current();
      this.showSpeaker(block.speeches[cur.speechIndex].speaker);
      this.bodyText.setText(cur.page.join('\n'));
      const more = cur.pageNo < cur.pageCount || cur.speechIndex < pages.length - 1;
      this.pageText.setText(cur.pageCount > 1 ? `${more ? '▼ ' : ''}${cur.pageNo}/${cur.pageCount}` : more ? '▼' : '');
    };
    render();
    const wasVisible = this.dialog.visible;
    this.dialog.setVisible(true);
    const ready = wasVisible ? Promise.resolve() : this.slideIn();

    return new Promise<void>((resolve) => {
      let accepting = false;
      void ready.then(() => (accepting = true));
      const step = () => {
        if (!accepting) return;
        const r = cursor.advance(this.game.loop.frame);
        if (r === 'ignored') return;
        this.sfx('page');
        if (r === 'next') return render();
        this.onAction = null;
        this.onTap = null;
        if (!keep) {
          this.dialog.setVisible(false);
          this.status.dialog = false;
          this.refreshGuide();
          this.setWorldInput(true);
        }
        resolve();
      };
      this.onAction = (a) => {
        if (a === 'confirm') step();
      };
      this.onTap = step;
    });
  }

  private runChoice(anchor: string): Promise<string> {
    const block = this.script.blocks.get(anchor);
    if (!block || block.kind !== 'choices' || !block.choices.length) return Promise.resolve('');
    const n = block.choices.length;
    const h = n * CHOICE.rowH + CHOICE.pad * 2;
    const x = CHOICE.right - CHOICE.w;
    const y = CHOICE.bottom - h;
    this.choiceFrame.clear();
    frame(this.choiceFrame, x, y, CHOICE.w, h);
    for (const t of this.choiceRows) t.destroy();
    this.choiceRows = block.choices.map((c, i) => {
      const t = this.text(x + CHOICE.pad + 12, y + CHOICE.pad + i * CHOICE.rowH + 2, c.label);
      this.choiceBox.add(t);
      return t;
    });
    let sel = 0;
    const place = () => this.choiceCursor.setPosition(x + CHOICE.pad, y + CHOICE.pad + sel * CHOICE.rowH + 2);
    place();
    this.choiceBox.setVisible(true);
    this.status.choice = true;
    this.refreshGuide();
    this.setWorldInput(false);

    return new Promise<string>((resolve) => {
      let done = false;
      const zones: Phaser.GameObjects.Zone[] = [];
      const finish = () => {
        if (done) return;
        done = true;
        dbg.choiceCount++;
        this.sfx('page');
        for (const z of zones) z.destroy();
        this.onAction = null;
        this.onTap = null;
        this.choiceBox.setVisible(false);
        this.dialog.setVisible(false);
        this.status.choice = false;
        this.status.dialog = false;
        this.refreshGuide();
        this.setWorldInput(true);
        resolve(block.choices[sel].target);
      };
      block.choices.forEach((_, i) => {
        const z = this.add
          .zone(x, y + CHOICE.pad + i * CHOICE.rowH, CHOICE.w, CHOICE.rowH)
          .setOrigin(0)
          .setInteractive({ useHandCursor: true });
        z.on('pointerover', () => {
          sel = i;
          place();
        });
        z.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
          e.stopPropagation();
          sel = i;
          place();
          finish();
        });
        zones.push(z);
      });
      // Ignore the key press that closed the previous dialog page.
      const openedAt = this.game.loop.frame;
      this.onAction = (a) => {
        if (this.game.loop.frame === openedAt) return;
        if (a === 'up') sel = (sel + n - 1) % n;
        else if (a === 'down') sel = (sel + 1) % n;
        else if (a === 'confirm') return finish();
        place();
      };
      this.onTap = null;
    });
  }
}

