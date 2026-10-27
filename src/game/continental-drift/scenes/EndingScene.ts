import Phaser from 'phaser';
import { dbg } from '../../common/debug';

/** Placeholder until the ending task. */
export class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  create() {
    dbg.scene = 'Ending';
    dbg.world = this;
  }
}
