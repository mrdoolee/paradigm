import Phaser from 'phaser';

/** Named input actions. Scenes react to these, never to raw keys. */
export type Action = 'confirm' | 'cancel' | 'up' | 'down' | 'left' | 'right' | 'cycle';

const KEYMAP: Record<string, Action> = {
  Enter: 'confirm',
  ' ': 'confirm',
  Escape: 'cancel',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Tab: 'cycle',
};

/**
 * Calls onAction for mapped keys while the scene's input is enabled.
 * Returns a function that removes the binding (also removed on scene shutdown).
 */
export function bindActions(scene: Phaser.Scene, onAction: (a: Action) => void): () => void {
  const kb = scene.input.keyboard;
  if (!kb) return () => {};
  kb.addCapture('TAB,SPACE,UP,DOWN,LEFT,RIGHT,ENTER');
  const handler = (e: KeyboardEvent) => {
    const a = KEYMAP[e.key];
    if (!a || !scene.input.enabled) return;
    onAction(a);
  };
  kb.on('keydown', handler);
  const off = () => kb.off('keydown', handler);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  return off;
}
