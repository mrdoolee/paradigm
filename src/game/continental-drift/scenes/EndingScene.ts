import Phaser from 'phaser';
import { DragBoard } from '../../common/DragBoard';
import { dbg, enterScene } from '../../common/debug';
import { PUZZLE_AREA } from '../../common/layout';
import { VIEW_H, VIEW_W } from '../../common/screen';
import { UI_KEY, type UiScene } from '../../common/UiScene';
import { worldPieces } from '../data';

/** ⑥ Pangea drifts apart into today's map, the last words, then the summary window. */
export class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  create() {
    enterScene('Ending', this);
    const ui = this.scene.get(UI_KEY) as UiScene;
    ui.bind(this);

    if (this.textures.exists('sail/sea')) this.add.image(0, 0, 'sail/sea').setOrigin(0);
    const g = this.add.graphics().setVisible(!this.textures.exists('sail/sea'));
    g.fillStyle(0x274660).fillRect(0, 0, VIEW_W, VIEW_H);
    g.fillStyle(0x2d506c);
    for (let x = 0; x < VIEW_W; x += 40) g.fillRect(x, 0, 1, VIEW_H);
    for (let y = 22; y < VIEW_H; y += 40) g.fillRect(0, y, VIEW_W, 1);

    const specs = worldPieces();
    const today = Object.fromEntries(specs.map((s) => [s.id, { ...s.start }]));
    for (const s of specs) s.start = { ...s.target };
    const board = new DragBoard(this, specs, PUZZLE_AREA);
    board.setEnabled(false);
    board.showAll();
    dbg.board = board;

    void (async () => {
      await new Promise<void>((r) => this.time.delayedCall(400, r));
      await new Promise<void>((r) => board.moveAll(today, 8, r));
      await ui.say('ending');
      this.scene.start('Summary');
    })();
  }
}
