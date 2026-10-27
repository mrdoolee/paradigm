import Phaser from 'phaser';
import { UI_KEY, UiScene } from '../../common/UiScene';
import type { Script } from '../../../script/parse';
import { ART } from '../data';

/** Loads every activity image and sound once, starts the UI overlay, then the first scene. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    for (const [key, url] of Object.entries(ART)) this.load.image(key, url);
    for (const name of ['page', 'snap', 'done']) this.load.audio(`sfx-${name}`, `/sfx/${name}.wav`);
  }

  create() {
    const params = new URLSearchParams(location.search);
    const script = this.registry.get('script') as Script;
    const ui = this.scene.get(UI_KEY) as UiScene;
    ui.setScript(script);
    this.scene.launch(UI_KEY);
    // Dev-only shortcuts used by tests and tuning: ?start=<Scene>&debug=assembled
    const first = (import.meta.env.DEV && params.get('start')) || 'Title';
    if (import.meta.env.DEV && params.get('steady')) this.registry.set('steady', true);
    const data: Record<string, unknown> = {};
    if (import.meta.env.DEV && params.get('debug') === 'assembled') data.assembled = true;
    if (import.meta.env.DEV && params.get('phases')) data.phases = params.get('phases')!.split(',');
    this.scene.start(first, data);
  }
}
