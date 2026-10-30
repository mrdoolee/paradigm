import Phaser from 'phaser';
import { bindActions } from '@engine/actions';
import { enterScene } from '@engine/debug';
import { FONT } from '@engine/layout';
import { VIEW_H, VIEW_W } from '@engine/screen';
import { UI_KEY, type UiScene } from '@engine/UiScene';

/** Title screen: the activity name and "press to start". Any confirm or tap starts the puzzle. */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    enterScene('Title', this);
    const ui = this.scene.get(UI_KEY) as UiScene;
    ui.bind(this);

    if (this.textures.exists('scenes/title')) {
      this.add.image(0, 0, 'scenes/title').setOrigin(0);
      this.add.rectangle(VIEW_W / 2, 156, 300, 76, 0x121a28).setStrokeStyle(2, 0xe8dfc6);
    } else {
      const g = this.add.graphics();
      g.fillStyle(0x274660).fillRect(0, 0, VIEW_W, VIEW_H);
      g.fillStyle(0x2d506c);
      for (let x = 0; x < VIEW_W; x += 40) g.fillRect(x, 0, 1, VIEW_H);
      for (let y = 0; y < VIEW_H; y += 40) g.fillRect(0, y, VIEW_W, 1);
    }

    const style = { fontFamily: FONT.family, fontSize: `${FONT.sizePx}px`, color: '#f4ecd8' };
    // Title drawn at 2x of the pixel font by scaling the text object by an integer.
    this.add.text(VIEW_W / 2, 144, ui.line('line-title'), style).setOrigin(0.5).setScale(2);
    const start = this.add.text(VIEW_W / 2, 178, ui.line('line-start'), { ...style, color: '#ffd23f' }).setOrigin(0.5);
    this.time.addEvent({ delay: 500, loop: true, callback: () => start.setVisible(!start.visible) });
    // how to play, in one line under the title box
    const controls = this.add.text(VIEW_W / 2, 222, ui.line('line-controls'), { ...style, color: '#c8d0dc' }).setOrigin(0.5);
    this.add
      .rectangle(VIEW_W / 2, 222, Math.ceil(controls.width) + 16, 20, 0x121a28)
      .setStrokeStyle(2, 0xe8dfc6)
      .setDepth(0);
    controls.setDepth(1);

    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      ui.sfx('page');
      this.scene.start('Town', { town: 'lab', at: 'start' });
    };
    bindActions(this, (a) => a === 'confirm' && go());
    this.input.once('pointerdown', go);
  }
}
