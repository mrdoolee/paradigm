import './touchpad.css';
import { PAD_KEYS, PAD_MIN_ROOM, padDirs, sideRoom, type PadDir, type PadKey } from './pad';
import { pickZoom } from './screen';
import { TOUCH_CONFIRM, TOUCH_CYCLE } from './strings';

// On-screen buttons for a phone held sideways. They sit in the empty bands left and right of the
// game (outside the 480x360 canvas, so this is the one place game code builds HTML) and send the
// same keyboard events a keyboard would, so every scene works with them unchanged.

const REPEAT_DELAY = 350;
const REPEAT_EVERY = 90;

function send(type: 'keydown' | 'keyup', k: PadKey, repeat = false) {
  const e = new KeyboardEvent(type, { key: k.key, code: k.code, repeat, bubbles: true, cancelable: true });
  // Phaser matches keys by keyCode, which the KeyboardEvent constructor cannot set.
  Object.defineProperty(e, 'keyCode', { get: () => k.keyCode });
  Object.defineProperty(e, 'which', { get: () => k.keyCode });
  window.dispatchEvent(e);
}

/** One held key: down now, then repeats like a held keyboard key until released. */
class Held {
  private timer = 0;
  constructor(private readonly k: PadKey) {
    send('keydown', k);
    const tick = (delay: number) => {
      this.timer = window.setTimeout(() => {
        send('keydown', k, true);
        tick(REPEAT_EVERY);
      }, delay);
    };
    tick(REPEAT_DELAY);
  }
  release() {
    window.clearTimeout(this.timer);
    send('keyup', this.k);
  }
}

function div(cls: string, text?: string) {
  const e = document.createElement('div');
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** A button that holds one key while pressed. */
function keyButton(cls: string, label: string, k: PadKey) {
  const b = div(`tp-btn ${cls}`, label);
  let held: Held | null = null;
  const up = () => {
    held?.release();
    held = null;
    b.classList.remove('is-down');
  };
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    if (held) return;
    held = new Held(k);
    b.classList.add('is-down');
  });
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('lostpointercapture', up);
  return b;
}

/** Cross pad: the thumb can slide between directions without lifting. */
function crossPad() {
  const pad = div('tp-dpad');
  const arms = {} as Record<PadDir, HTMLElement>;
  for (const [d, sym] of [['up', '▲'], ['left', '◀'], ['right', '▶'], ['down', '▼']] as const) {
    arms[d] = div(`tp-arm tp-arm-${d}`, sym);
    pad.append(arms[d]);
  }
  pad.append(div('tp-hub'));
  const held = new Map<PadDir, Held>();
  let pointer: number | null = null;
  const hold = (dirs: PadDir[]) => {
    for (const [d, h] of held) {
      if (dirs.includes(d)) continue;
      h.release();
      held.delete(d);
      arms[d].classList.remove('is-down');
    }
    for (const d of dirs) {
      if (held.has(d)) continue;
      held.set(d, new Held(PAD_KEYS[d]));
      arms[d].classList.add('is-down');
    }
  };
  const aim = (e: PointerEvent) => {
    const r = pad.getBoundingClientRect();
    hold(padDirs(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2), r.width * 0.12));
  };
  const end = (e: PointerEvent) => {
    if (e.pointerId !== pointer) return;
    pointer = null;
    hold([]);
  };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (pointer !== null) return;
    pointer = e.pointerId;
    pad.setPointerCapture(e.pointerId);
    aim(e);
  });
  pad.addEventListener('pointermove', (e) => e.pointerId === pointer && aim(e));
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
  pad.addEventListener('lostpointercapture', end);
  return pad;
}

/** Adds the buttons to the page; they show only on a touch screen held sideways with room beside the game. */
export function mountTouchpad() {
  const left = div('tp tp-left');
  const right = div('tp tp-right');
  left.setAttribute('aria-hidden', 'true');
  right.setAttribute('aria-hidden', 'true');
  left.append(crossPad());
  right.append(keyButton('tp-a', TOUCH_CONFIRM, PAD_KEYS.confirm), keyButton('tp-cycle', TOUCH_CYCLE, PAD_KEYS.cycle));
  document.body.append(left, right);
  for (const side of [left, right]) side.addEventListener('contextmenu', (e) => e.preventDefault());

  const coarse = window.matchMedia('(pointer: coarse)');
  const layout = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const room = sideRoom(w, pickZoom(w, h));
    const on = coarse.matches && w > h && room >= PAD_MIN_ROOM;
    document.documentElement.classList.toggle('tp-on', on);
    document.documentElement.style.setProperty('--tp-room', `${Math.floor(room)}px`);
  };
  layout();
  window.addEventListener('resize', layout);
  coarse.addEventListener('change', layout);
}
