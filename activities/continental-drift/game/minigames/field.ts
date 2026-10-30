import type Phaser from 'phaser';
import { UI_KEY, type UiScene } from '@engine/UiScene';
import { FIELD_PORT, type FieldGame, type Run } from '../run';

/** Shared start and end of a field mini-game: intro dialog, then afterwards the trip home. */
export class FieldFlow {
  readonly ui: UiScene;
  readonly run: Run;
  private finished = false;

  constructor(
    private scene: Phaser.Scene,
    private game: FieldGame,
  ) {
    this.ui = scene.scene.get(UI_KEY) as UiScene;
    this.ui.bind(scene);
    this.run = scene.registry.get('run') as Run;
  }

  /** True once finish() has been called: input handlers check it so the end fires only once. */
  get over(): boolean {
    return this.finished;
  }

  async intro(before: string, guide: string, dots?: { done: number; total: number }) {
    await this.ui.say(before);
    this.ui.setGuide(guide, dots ?? null);
  }

  async finish(after: string) {
    if (this.finished) return;
    this.finished = true;
    this.ui.setGuide(null);
    this.ui.sfx('done');
    await new Promise<void>((r) => this.scene.time.delayedCall(400, r));
    await this.ui.say(after);
    this.run.complete('field');
    this.scene.scene.start('Sail', { returnFrom: FIELD_PORT[this.game] });
  }
}
