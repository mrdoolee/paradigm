import type { Page } from '@playwright/test';

type Pt = { x: number; y: number };
export interface NosState {
  scene: string;
  phase: string | null;
  dialog: boolean;
  choice: boolean;
  guide: string | null;
  sound: boolean;
  music: string | null;
  zoom: number;
  choiceCount: number;
  world: { x: number; y: number; zoom: number; scrollX: number; scrollY: number } | null;
}
export interface PieceInfo {
  pos: Pt;
  target: Pt;
  snapped: boolean;
  size: { w: number; h: number };
}

export const isTouch = (projectName: string) => projectName === 'tablet';

export async function waitForNos(page: Page) {
  await page.waitForFunction(() => {
    const w = window as unknown as { __nos?: { state(): { scene: string } } };
    return !!w.__nos && w.__nos.state().scene !== '';
  });
}

export const state = (page: Page) =>
  page.evaluate(() => (window as unknown as { __nos: { state(): NosState } }).__nos.state());

export const piece = (page: Page, id: string) =>
  page.evaluate((id) => (window as unknown as { __nos: { piece(id: string): PieceInfo | null } }).__nos.piece(id), id);

export const movable = (page: Page) =>
  page.evaluate(() => (window as unknown as { __nos: { movable(): string[] } }).__nos.movable());

export const goalPoint = (page: Page) =>
  page.evaluate(() => (window as unknown as { __nos: { goalPoint(): Pt | null } }).__nos.goalPoint());

export const player = (page: Page) =>
  page.evaluate(() => (window as unknown as { __nos: { player(): Pt | null } }).__nos.player());

export const minigame = (page: Page) =>
  page.evaluate(() => (window as unknown as { __nos: { minigame(): { kind: string; todo: Pt[] } | null } }).__nos.minigame());

export interface SummaryInfo {
  page: number;
  pages: number;
  next: Pt | null;
  links: Pt[];
}
export const summary = (page: Page) =>
  page.evaluate(() => (window as unknown as { __nos: { summary(): SummaryInfo | null } }).__nos.summary());

/** Centre of town cell (x, y) on the virtual screen: towns are shown at 2x under the 22px top bar. */
export const townCell = (x: number, y: number): Pt => ({ x: x * 32 + 16, y: 22 + y * 32 + 16 });

export const toScreen = (page: Page, p: Pt) =>
  page.evaluate((p) => (window as unknown as { __nos: { toScreen(p: Pt): Pt } }).__nos.toScreen(p), p);

/** Finds a pixel of the piece that is land, so the press hits the pixel-perfect shape. */
async function grabPoint(page: Page, id: string): Promise<Pt> {
  return page.evaluate((id) => {
    const w = window as unknown as {
      __nos: { piece(id: string): PieceInfo; grabOffset?(id: string): Pt | null };
    };
    const info = w.__nos.piece(id);
    const off = w.__nos.grabOffset?.(id) ?? { x: info.size.w / 2, y: info.size.h / 2 };
    return { x: info.pos.x + off.x, y: info.pos.y + off.y };
  }, id);
}

async function dragPath(page: Page, from: Pt, to: Pt, touch: boolean) {
  const steps = 8;
  if (!touch) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    }
    await page.mouse.up();
    return;
  }
  const cdp = await page.context().newCDPSession(page);
  const tp = (p: Pt) => [{ x: p.x, y: p.y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(from) });
  for (let i = 1; i <= steps; i++) {
    const p = { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(p) });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

/** Drags a piece so its top-left lands on `to` (virtual coords) or on its target. */
export async function dragPiece(page: Page, id: string, to: 'target' | Pt, touch: boolean) {
  const info = (await piece(page, id))!;
  const grab = await grabPoint(page, id);
  const dest = to === 'target' ? info.target : to;
  const drop = { x: grab.x + (dest.x - info.pos.x), y: grab.y + (dest.y - info.pos.y) };
  await dragPath(page, await toScreen(page, grab), await toScreen(page, drop), touch);
  await page.waitForTimeout(250);
}

/** Taps (touch) or clicks the virtual point. */
export async function tapAt(page: Page, p: Pt, touch: boolean) {
  const s = await toScreen(page, p);
  if (touch) await page.touchscreen.tap(s.x, s.y);
  else await page.mouse.click(s.x, s.y);
}

/** Advances one dialog page: Enter on desktop, tap on the dialog box on tablet. */
export async function advance(page: Page, touch: boolean) {
  if (touch) await tapAt(page, { x: 240, y: 300 }, true);
  else await page.keyboard.press('Enter');
  await page.waitForTimeout(80);
}

/**
 * Plays forward until pred(state) is true: confirms choices, advances dialogs,
 * drags the next movable piece onto its target, presses start on the title.
 */
export async function playUntil(page: Page, pred: (s: NosState) => boolean, touch: boolean, max = 400) {
  for (let i = 0; i < max; i++) {
    const s = await state(page);
    if (pred(s)) return s;
    if (s.choice) {
      if (touch) await tapAt(page, { x: 380, y: 258 - 6 - 16 * 2 + 8 }, true);
      else await page.keyboard.press('Enter');
      await page.waitForTimeout(80);
    } else if (s.dialog) {
      await advance(page, touch);
    } else if (s.scene === 'Town' || s.scene === 'Sail') {
      const p = await goalPoint(page);
      if (p) {
        await tapAt(page, p, touch);
        await page.waitForTimeout(600);
      } else await page.waitForTimeout(150);
    } else if ((await movable(page)).length) {
      const ids = await movable(page);
      await dragPiece(page, ids[0], 'target', touch);
    } else if (await minigame(page)) {
      const m = (await minigame(page))!;
      if (m.todo.length) await tapAt(page, m.todo[0], touch);
      await page.waitForTimeout(m.kind === 'survey' ? 400 : 60);
    } else if (s.scene === 'Title') {
      await advance(page, touch);
    } else if (s.scene === 'Summary') {
      const sm = await summary(page);
      if (sm?.next) await tapAt(page, sm.next, touch);
      await page.waitForTimeout(150);
    } else {
      await page.waitForTimeout(100);
    }
  }
  throw new Error(`playUntil: condition not reached; last state ${JSON.stringify(await state(page))}`);
}

/** Picks choice i (0-based) of a 3-row choice box: arrow keys on desktop, tap on the row on tablet. */
export async function chooseIndex(page: Page, i: number, rows: number, touch: boolean) {
  const top = 258 - (rows * 16 + 12) + 6;
  if (touch) {
    await tapAt(page, { x: 380, y: top + i * 16 + 8 }, true);
  } else {
    for (let k = 0; k < i; k++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
  }
  await page.waitForTimeout(120);
}
