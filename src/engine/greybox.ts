import Phaser from 'phaser';

/**
 * Returns `artKey` when that image was loaded, otherwise builds a grey-box texture once
 * under `fallbackKey` with `draw` and returns that. Art can be dropped in later without code changes.
 */
export function artOr(
  scene: Phaser.Scene,
  artKey: string,
  fallbackKey: string,
  w: number,
  h: number,
  draw: (g: Phaser.GameObjects.Graphics) => void,
): string {
  if (scene.textures.exists(artKey)) return artKey;
  if (!scene.textures.exists(fallbackKey)) {
    const g = scene.add.graphics();
    draw(g);
    g.generateTexture(fallbackKey, w, h);
    g.destroy();
  }
  return fallbackKey;
}

/** A 16x16 grey-box person: head, body, and a darker band for the feet. */
export function drawPerson(g: Phaser.GameObjects.Graphics, body: number, head = 0xe8c8a0) {
  g.fillStyle(0x1b2a38).fillRect(4, 1, 8, 14);
  g.fillStyle(head).fillRect(5, 2, 6, 5);
  g.fillStyle(body).fillRect(5, 7, 6, 6);
  g.fillStyle(0x2a2220).fillRect(5, 13, 2, 2).fillRect(9, 13, 2, 2);
}
