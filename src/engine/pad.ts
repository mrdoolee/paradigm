import { VIEW_W } from './screen';

/** A key the on-screen buttons stand in for: what Phaser and bindActions read off a KeyboardEvent. */
export interface PadKey {
  key: string;
  code: string;
  keyCode: number;
}

export const PAD_KEYS = {
  up: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  down: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  left: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  right: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  confirm: { key: ' ', code: 'Space', keyCode: 32 },
  cycle: { key: 'Tab', code: 'Tab', keyCode: 9 },
} satisfies Record<string, PadKey>;

export type PadDir = 'up' | 'down' | 'left' | 'right';

/** Narrowest side margin (CSS px) that still holds the cross pad; below it the buttons stay hidden. */
export const PAD_MIN_ROOM = 88;

/** Width of the empty band on each side of the centred game. */
export function sideRoom(innerW: number, zoom: number): number {
  return Math.max(0, (innerW - VIEW_W * zoom) / 2);
}

/**
 * Directions held by a thumb at (dx, dy) from the pad centre, 8 ways:
 * the diagonal 45-degree sectors hold two arrows at once (sailing goes diagonally).
 * Inside the dead zone nothing is held.
 */
export function padDirs(dx: number, dy: number, deadZone: number): PadDir[] {
  if (Math.hypot(dx, dy) < deadZone) return [];
  const sector = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)); // -4..4, 0 = right, 2 = down
  const dirs: PadDir[][] = [['left'], ['left', 'up'], ['up'], ['up', 'right'], ['right'], ['right', 'down'], ['down'], ['down', 'left'], ['left']];
  return dirs[sector + 4];
}
