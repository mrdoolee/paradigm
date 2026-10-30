import Phaser from 'phaser';
import { bindActions } from '../../common/actions';
import { dbg, enterScene } from '../../common/debug';
import { FONT, SUMMARY, type Pt } from '../../common/layout';
import { VIEW_H, VIEW_W } from '../../common/screen';
import { UI_COLORS as C, UI_KEY, frame, type UiScene } from '../../common/UiScene';
import type { Script } from '../../../script/parse';
import { galmuriMeasure } from '../../../script/measure';
import { BULLET, layoutPage, type PageLayout } from '../../../script/page';

const S = SUMMARY;
const FOCUS_GUARD_MS = 600;

/**
 * The last scene: the summary page (`page-about` in script.md) in one full-screen window,
 * turned page by page. The last page ends with the page's links as buttons.
 */
export class SummaryScene extends Phaser.Scene {
  private layout!: PageLayout;
  private page = 0;
  private focus = -1;
  /** last time the focus moved or Enter was pressed; Enter presses a button only after a calm moment, so mashing Enter never leaves the game */
  private focusAt = 0;
  private body!: Phaser.GameObjects.Container;
  private pageText!: Phaser.GameObjects.Text;
  private prev!: Phaser.GameObjects.Text;
  private next!: Phaser.GameObjects.Text;
  private links: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Text;

  constructor() {
    super('Summary');
  }

  create() {
    enterScene('Summary', this);
    const ui = this.scene.get(UI_KEY) as UiScene;
    ui.bind(this);
    ui.setGuide(null);
    const script = this.registry.get('script') as Script;
    const b = script.blocks.get('page-about');
    this.layout = layoutPage(b && b.kind === 'page' ? b.markdown : '', galmuriMeasure, S.textW, S.rows);
    this.page = 0;
    this.focus = 0;
    this.focusAt = 0;

    if (this.textures.exists('sail/sea')) this.add.image(0, 0, 'sail/sea').setOrigin(0);
    else this.add.graphics().fillStyle(0x274660).fillRect(0, 0, VIEW_W, VIEW_H);
    const g = this.add.graphics();
    frame(g, S.box.x, S.box.y, S.box.w, S.box.h);
    g.fillStyle(C.boxInner).fillRect(S.textX, S.lineY, S.textW, 1);
    this.text(VIEW_W / 2, S.titleY, this.layout.title, C.accent).setOrigin(0.5, 0);
    this.body = this.add.container(0, 0);

    this.prev = this.button(S.textX, '◀', () => this.turn(-1));
    this.next = this.button(S.box.x + S.box.w - 14, '▶', () => this.turn(1)).setOrigin(1, 0);
    this.pageText = this.text(VIEW_W / 2, S.footY, '', C.dim).setOrigin(0.5, 0);
    // links sit at the right of the footer on the last page, right to left
    let right = S.box.x + S.box.w - 14;
    this.links = [...this.layout.links].reverse().map((l) => {
      const t = this.button(right, l.label, () => location.assign(l.href)).setOrigin(1, 0);
      right -= t.width + 10;
      return t;
    });
    this.links.reverse();
    this.cursor = this.text(0, S.footY, '▶', C.accent).setOrigin(1, 0).setVisible(false);

    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!over.length && !this.isLast()) this.turn(1);
    });
    bindActions(this, (a) => {
      if (a === 'left') this.turn(-1);
      else if (a === 'right') this.turn(1);
      else if (a === 'confirm') {
        if (!this.isLast()) this.turn(1);
        else {
          const calm = this.time.now - this.focusAt >= FOCUS_GUARD_MS;
          this.focusAt = this.time.now;
          if (calm && this.links.length) location.assign(this.layout.links[this.focus].href);
        }
      } else if ((a === 'up' || a === 'down' || a === 'cycle') && this.isLast() && this.links.length) {
        const n = this.links.length;
        this.focus = (this.focus + (a === 'up' ? n - 1 : 1)) % n;
        this.focusAt = this.time.now;
        this.drawFocus();
      }
    });

    dbg.summary = () => ({
      page: this.page,
      pages: this.layout.pages.length,
      next: this.isLast() ? null : this.center(this.next),
      links: this.isLast() ? this.links.map((t) => this.center(t)) : [],
    });
    this.show();
  }

  private isLast() {
    return this.page >= this.layout.pages.length - 1;
  }

  private turn(d: number) {
    const to = Phaser.Math.Clamp(this.page + d, 0, this.layout.pages.length - 1);
    if (to === this.page) return;
    this.page = to;
    // the last page opens with the first button picked (shown with the cursor), so Enter works from there
    this.focus = 0;
    this.focusAt = this.time.now;
    (this.scene.get(UI_KEY) as UiScene).sfx('page');
    this.show();
  }

  private show() {
    this.body.removeAll(true);
    const rows = this.layout.pages[this.page] ?? [];
    rows.forEach((r, i) => {
      const y = S.textY + i * S.rowH;
      if (r.kind === 'gap' || r.kind === 'imgfill') return;
      if (r.img) {
        // a picture fills its rows, centred, with a thin dark frame
        const x = Math.round(S.textX + (S.textW - r.img.w) / 2);
        const g = this.add.graphics();
        g.fillStyle(0x1b2a38).fillRect(x - 1, y - 1, r.img.w + 2, r.img.h + 2);
        this.body.add(g);
        if (this.textures.exists(r.img.key)) this.body.add(this.add.image(x, y, r.img.key).setOrigin(0));
        return;
      }
      if (r.kind === 'cap') {
        this.body.add(this.text(S.textX + S.textW / 2, y + 2, r.text, C.dim).setOrigin(0.5, 0));
        return;
      }
      if (r.bullet) this.body.add(this.text(S.textX, y, BULLET, C.dim));
      this.body.add(this.text(S.textX + r.indent, y, r.text, r.kind === 'h' ? C.accent : C.ink));
    });
    const last = this.isLast();
    this.prev.setVisible(this.page > 0);
    this.next.setVisible(!last);
    for (const t of this.links) t.setVisible(last);
    this.pageText.setText(`${this.page + 1} / ${this.layout.pages.length}`);
    this.drawFocus();
  }

  private drawFocus() {
    const t = this.isLast() ? this.links[this.focus] : undefined;
    this.links.forEach((l, i) => l.setColor(i === this.focus ? C.accent : C.ink));
    this.cursor.setVisible(!!t);
    if (t) this.cursor.setX(t.x - t.width - 2);
  }

  private center(t: Phaser.GameObjects.Text): Pt {
    const b = t.getBounds();
    return { x: b.centerX, y: b.centerY };
  }

  private text(x: number, y: number, s: string, color: string) {
    return this.add.text(x, y, s, { fontFamily: FONT.family, fontSize: `${FONT.sizePx}px`, color });
  }

  private button(x: number, label: string, onPress: () => void) {
    const t = this.text(x, S.footY, label, C.ink)
      .setBackgroundColor('#4b5870')
      .setPadding(4, 1, 4, 1)
      .setInteractive({ useHandCursor: true });
    t.on('pointerdown', onPress);
    return t;
  }
}
