import Phaser from 'phaser';
import { bindActions } from '../../common/actions';
import { dbg } from '../../common/debug';
import { FONT } from '../../common/layout';
import { VIEW_H, VIEW_W } from '../../common/screen';
import { UI_KEY, type UiScene } from '../../common/UiScene';
import { WORLD_PHASES } from '../data';

/** Title screen: the activity name and "press to start". Any confirm or tap starts the puzzle. */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    dbg.scene = 'Title';
    dbg.world = this;
    dbg.board = null;
    dbg.phase = null;
    const ui = this.scene.get(UI_KEY) as UiScene;
    ui.bind(this);

    const g = this.add.graphics();
    g.fillStyle(0x274660).fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(0x2d506c);
    for (let x = 0; x < VIEW_W; x += 40) g.fillRect(x, 0, 1, VIEW_H);
    for (let y = 0; y < VIEW_H; y += 40) g.fillRect(0, y, VIEW_W, 1);

    const style = { fontFamily: FONT.family, fontSize: `${FONT.sizePx}px`, color: '#f4ecd8' };
    // Title drawn at 2x of the pixel font by scaling the text object by an integer.
    this.add.text(VIEW_W / 2, 140, ui.line('line-title'), style).setOrigin(0.5).setScale(2);
    const start = this.add.text(VIEW_W / 2, 220, ui.line('line-start'), { ...style, color: '#ffd23f' }).setOrigin(0.5);
    this.time.addEvent({ delay: 500, loop: true, callback: () => start.setVisible(!start.visible) });

    let started = false;
    const go = () => {
      if (started) return;
      started = true;
      ui.sfx('page');
      this.scene.start('Puzzle', { phases: WORLD_PHASES, next: 'Debate' });
    };
    bindActions(this, (a) => a === 'confirm' && go());
    this.input.once('pointerdown', go);
  }
}
