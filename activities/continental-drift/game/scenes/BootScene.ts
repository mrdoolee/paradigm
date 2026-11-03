import Phaser from 'phaser';
import { UI_KEY, UiScene } from '@engine/UiScene';
import type { Script } from '@engine/script/parse';
import { ART, MUSIC } from '../data';
import { Run, advanceToTown, runFromStart, type TownId } from '../run';

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
    ui.setMusicSources(MUSIC);
    this.scene.launch(UI_KEY);
    const dev = import.meta.env.DEV;
    // Dev-only shortcuts used by tests and tuning:
    // ?start=<Scene>&evidence=<0..3>&town=<id>&at=<spawn>&phases=a,b&debug=assembled
    const run = dev && params.get('goal') ? new Run(Number(params.get('goal'))) : runFromStart(dev ? params.get('evidence') : null);
    const town = (dev && (params.get('town') as TownId | null)) || 'lab';
    if (dev) advanceToTown(run, town);
    this.registry.set('run', run);
    const first = (dev && params.get('start')) || 'Title';
    if (import.meta.env.DEV && params.get('steady')) this.registry.set('steady', true);
    const data: Record<string, unknown> = {};
    if (import.meta.env.DEV && params.get('debug') === 'assembled') data.assembled = true;
    if (import.meta.env.DEV && params.get('phases')) data.phases = params.get('phases')!.split(',');
    if (dev && first === 'Town') {
      data.town = town;
      data.at = params.get('at') ?? (town === 'lab' ? 'start' : 'port');
    }
    if (dev && first === 'Puzzle' && params.get('phases')) data.next = 'Town';
    if (dev && first === 'Sail') {
      const g = run.goal;
      if (params.get('return')) data.returnFrom = params.get('return');
      else data.to = g.kind === 'sail' ? g.port : 'mumbai';
    }
    this.scene.start(first, data);
  }
}
