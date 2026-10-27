import Phaser from 'phaser';
import { ART } from '../data';

/** Loads every activity image once, then hands over to the first scene. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    for (const [key, url] of Object.entries(ART)) this.load.image(key, url);
  }

  create() {
    const params = new URLSearchParams(location.search);
    const first = this.registry.get('firstScene') as string;
    this.scene.start(first, params.get('debug') === 'assembled' ? { assembled: true } : undefined);
  }
}
