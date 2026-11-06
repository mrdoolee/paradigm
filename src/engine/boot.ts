import Phaser from 'phaser';
import { VIEW_W, VIEW_H, pickZoom } from './screen';
import { mountTouchpad } from './touchpad';

export const BORDER_COLOR = '#14161c';
export const FONT_FAMILY = 'Galmuri11';

/** Waits for the pixel font, then creates one fixed 480x360 game at an integer zoom. */
export async function startGame(
  scenes: Phaser.Types.Scenes.SceneType[],
  parent: HTMLElement,
  registry: Record<string, unknown> = {},
): Promise<Phaser.Game> {
  try {
    await document.fonts.load(`12px ${FONT_FAMILY}`, String.fromCharCode(0xac00) + 'A');
  } catch {
    // Font load errors fall back to the system font; the script checker still guards widths.
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: VIEW_W,
    height: VIEW_H,
    pixelArt: true,
    backgroundColor: '#20262e',
    parent,
    scale: { mode: Phaser.Scale.NONE, zoom: pickZoom(window.innerWidth, window.innerHeight) },
    input: { activePointers: 2 },
    scene: scenes,
    callbacks: {
      preBoot: (g) => {
        for (const [k, v] of Object.entries(registry)) g.registry.set(k, v);
      },
    },
  });
  const onResize = () => {
    const z = pickZoom(window.innerWidth, window.innerHeight);
    if (game.scale.zoom !== z) game.scale.setZoom(z);
  };
  window.addEventListener('resize', onResize);
  mountTouchpad();
  return game;
}
