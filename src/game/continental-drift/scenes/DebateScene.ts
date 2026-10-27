import Phaser from 'phaser';
import { dbg } from '../../common/debug';

/** Placeholder until the debate task: goes straight on. */
export class DebateScene extends Phaser.Scene {
  constructor() {
    super('Debate');
  }

  create() {
    dbg.scene = 'Debate';
    dbg.world = this;
  }
}
