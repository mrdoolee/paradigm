import Phaser from 'phaser';
import { enterScene } from '@engine/debug';
import { VIEW_H, VIEW_W } from '@engine/screen';
import { FONT } from '@engine/layout';
import { UI_COLORS, UI_KEY, frame, type UiScene } from '@engine/UiScene';
import type { Run } from '../run';

const WALL = 0x3a2f2a;
const FLOOR = 0x5a4636;
const BOARD = 0x2f4a3a;
const WOOD = 0x8a6440;
const SEAT = 0x2a2220;
const FIGURE = 0x6b7a90;

/** The land-bridge picture: a framed board above the dialog box, with a one-line caption on top. */
const PANEL = { x: 86, y: 24, w: 308, h: 222, imgX: 90, imgY: 42, imgW: 300, imgH: 200, captionY: 28 };

/**
 * ④ The society meeting. Every choice gets one rebuttal and the story moves on:
 * there is no right or wrong mark here.
 */
export class DebateScene extends Phaser.Scene {
  constructor() {
    super('Debate');
  }

  create() {
    enterScene('Debate', this);
    const ui = this.scene.get(UI_KEY) as UiScene;
    ui.bind(this);
    this.drawHall();
    void this.run(ui);
  }

  /** Grey-box lecture hall: blackboard with a world sketch, podium, rows of listeners. */
  private drawHall() {
    if (this.textures.exists('scenes/debate')) {
      this.add.image(0, 0, 'scenes/debate').setOrigin(0);
      return;
    }
    const g = this.add.graphics();
    g.fillStyle(WALL).fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(FLOOR).fillRect(0, 168, VIEW_W, VIEW_H - 168);
    g.fillStyle(0x2a211d).fillRect(0, 166, VIEW_W, 2);
    // blackboard
    g.fillStyle(0x6d5236).fillRect(132, 34, 216, 100);
    g.fillStyle(BOARD).fillRect(136, 38, 208, 92);
    g.fillStyle(0xcfd8c8);
    for (const [x, y, w, h] of [
      [176, 62, 22, 30],
      [204, 56, 30, 40],
      [262, 52, 46, 28],
    ]) {
      g.fillRect(x, y, w, 1).fillRect(x, y + h, w, 1).fillRect(x, y, 1, h).fillRect(x + w, y, 1, h + 1);
    }
    // podium and speaker
    g.fillStyle(FIGURE).fillRect(232, 120, 16, 16).fillRect(226, 136, 28, 24);
    g.fillStyle(WOOD).fillRect(216, 146, 48, 30);
    g.fillStyle(0x6a4a2e).fillRect(216, 146, 48, 3);
    // listeners: rows of heads and chair backs, the nearest row largest
    const rows: [number, number, number][] = [
      [184, 7, 26],
      [204, 9, 34],
      [226, 11, 44],
    ];
    for (const [y, r, step] of rows) {
      for (let x = 14 + (y % 3) * 4; x < VIEW_W; x += step) {
        g.fillStyle(FIGURE).fillRect(x, y - r, r * 2 - 2, r * 2 - 2);
        g.fillStyle(SEAT).fillRect(x - 3, y + r - 2, r * 2 + 4, r + 4);
      }
    }
  }

  private showPanel(panel: Phaser.GameObjects.Container, ui: UiScene, image: string, caption: string) {
    panel.removeAll(true);
    const g = this.add.graphics();
    frame(g, PANEL.x, PANEL.y, PANEL.w, PANEL.h);
    panel.add(g);
    if (this.textures.exists(image)) panel.add(this.add.image(PANEL.imgX, PANEL.imgY, image).setOrigin(0));
    else panel.add(this.add.graphics().fillStyle(0x1b422c).fillRect(PANEL.imgX, PANEL.imgY, PANEL.imgW, PANEL.imgH));
    panel.add(
      this.add
        .text(PANEL.x + PANEL.w / 2, PANEL.captionY, ui.line(caption), {
          fontFamily: FONT.family,
          fontSize: `${FONT.sizePx}px`,
          color: UI_COLORS.accent,
        })
        .setOrigin(0.5, 0),
    );
  }

  private async run(ui: UiScene) {
    await ui.say('debate-arrive');
    await ui.say('debate-mechanism-q', { keep: true });
    const reply = await ui.choose('choice-debate-mechanism');
    await ui.say(reply);
    // the opposing side's explanation, told with a picture: first the bridge, then the bridge sunk
    const panel = this.add.container(0, 0).setDepth(100);
    this.showPanel(panel, ui, 'scenes/landbridge', 'line-landbridge-1');
    await ui.say('debate-landbridge');
    this.showPanel(panel, ui, 'scenes/landbridge-sunk', 'line-landbridge-2');
    await ui.say('debate-landbridge-sink');
    panel.destroy();
    await ui.say('debate-response');
    await ui.say('debate-note');
    (this.registry.get('run') as Run | undefined)?.complete('debate');
    this.scene.start('Survey');
  }
}
