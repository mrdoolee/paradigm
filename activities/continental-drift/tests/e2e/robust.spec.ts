import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dragPiece, goalPoint, townCell, isTouch, minigame, piece, player, playUntil, state, tapAt, waitForNos } from '../../../../tests/e2e/helpers';

const zoomFor = (w: number, h: number) => Math.max(1, Math.min(Math.floor(w / 480), Math.floor(h / 360)));

test('@e2e 1280x690 창에서는 1배로 가운데, 스크롤 없이 퍼즐을 맞출 수 있다', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one viewport is enough');
  await page.setViewportSize({ width: 1280, height: 690 });
  await page.goto('/continental-drift/?start=Puzzle');
  await waitForNos(page);
  const box = (await page.locator('#game canvas').boundingBox())!;
  expect([Math.round(box.width), Math.round(box.height)]).toEqual([480, 360]);
  expect(Math.round(box.x)).toBe(Math.round((1280 - 480) / 2));
  const scroll = await page.evaluate(() => [
    document.documentElement.scrollWidth <= innerWidth,
    document.documentElement.scrollHeight <= innerHeight,
  ]);
  expect(scroll).toEqual([true, true]);
  await playUntil(page, (s) => s.phase === 'fossil', false);
  expect((await piece(page, 'south-america'))!.snapped).toBe(true);
});

test('@e2e 퍼즐 중 창 크기를 바꿔도 배율만 바뀌고 진행은 그대로다', async ({ page }, info) => {
  const touch = isTouch(info.project.name);
  await page.goto('/continental-drift/?start=Puzzle&phases=fossil');
  await waitForNos(page);
  await playUntil(page, (s) => s.phase === 'fossil' && !s.dialog, touch);
  await dragPiece(page, 'india', 'target', touch);
  expect((await piece(page, 'india'))!.snapped).toBe(true);
  for (const [w, h] of [
    [1024, 768],
    [1280, 690],
    [1280, 800],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(200);
    const s = await state(page);
    expect(s.zoom).toBe(zoomFor(w, h));
    expect(s.phase).toBe('fossil');
    expect(s.scene).toBe('Puzzle');
    expect((await piece(page, 'india'))!.snapped).toBe(true);
  }
  await dragPiece(page, 'antarctica', 'target', touch);
  await page.waitForFunction(() => (window as unknown as { __nos: { state(): { dialog: boolean } } }).__nos.state().dialog);
});

test('@e2e 대화·선택지에서 Enter를 연타해도 선택은 한 번만 처리된다', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'keyboard test');
  await page.goto('/continental-drift/?start=Debate');
  await waitForNos(page);
  await playUntil(page, (s) => s.dialog && !s.choice, false);
  const before = (await state(page)).choiceCount;
  // Mash Enter (every 30 ms) through the lines, the choice and the replies until the scene moves on.
  for (let i = 0; i < 150; i++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(30);
    if ((await state(page)).scene === 'Survey') break;
  }
  const s = await state(page);
  expect(s.scene).toBe('Survey');
  expect(s.choiceCount).toBe(before + 1);
});

test('@e2e 작은 창(1배)과 창 크기 바꿈에도 누른 칸으로 걸어간다', async ({ page }, info) => {
  const touch = isTouch(info.project.name);
  if (!touch) await page.setViewportSize({ width: 1280, height: 690 });
  await page.goto('/continental-drift/?start=Town&town=india');
  await waitForNos(page);
  await playUntil(page, (s) => !s.dialog, touch, 20);
  await tapAt(page, townCell(9, 6), touch);
  await expect.poll(() => player(page), { timeout: 5000 }).toEqual({ x: 9, y: 6 });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(200);
  await tapAt(page, townCell(12, 4), touch);
  await expect.poll(() => player(page), { timeout: 5000 }).toEqual({ x: 12, y: 4 });
});

test('@e2e 항해 중 땅을 눌러도 배는 바다에 있고, 다녀온 항구를 지나쳐도 멈추지 않는다', async ({ page }, info) => {
  const touch = isTouch(info.project.name);
  // goal 5 = sail to Sydney, Mumbai already visited
  await page.goto('/continental-drift/?start=Sail&goal=5');
  await waitForNos(page);
  await page.waitForTimeout(300);
  await tapAt(page, { x: 250, y: 130 }, touch); // middle of Africa
  await page.waitForTimeout(3000);
  const c = (await player(page))!;
  const grid = JSON.parse(readFileSync('activities/continental-drift/art/sea/sea-grid.json', 'utf8')) as { rows: string[] };
  expect(grid.rows[c.y][c.x]).toBe('.');
  expect((await state(page)).scene).toBe('Sail');
  // sail to Sydney: the route passes Mumbai's side of the ocean without a stop
  await playUntil(page, (s) => s.scene === 'Town', touch, 120);
});

test('@e2e 발굴 칸을 빠르게 연타해도 장면은 한 번만 넘어간다', async ({ page }, info) => {
  const touch = isTouch(info.project.name);
  await page.goto('/continental-drift/?start=Dig&goal=3');
  await waitForNos(page);
  await playUntil(page, (s) => !s.dialog, touch, 20);
  const m = (await minigame(page))!;
  for (const p of m.todo) for (let k = 0; k < 3; k++) await tapAt(page, p, touch);
  await page.waitForFunction(() => (window as unknown as { __nos: { state(): { dialog: boolean } } }).__nos.state().dialog);
  const scenes: string[] = [];
  await playUntil(
    page,
    (s) => {
      if (scenes[scenes.length - 1] !== s.scene) scenes.push(s.scene);
      return s.scene === 'Town';
    },
    touch,
    200,
  );
  expect(scenes).toEqual(['Dig', 'Sail', 'Town']);
});

test('@e2e 수에즈 운하: 눌러서 가도, 방향키로 몰아도 처음 지날 때 선장이 말한다', async ({ page }, info) => {
  test.setTimeout(90_000);
  const touch = isTouch(info.project.name);
  // tap route
  await page.goto('/continental-drift/?start=Sail&goal=1');
  await waitForNos(page);
  await tapAt(page, (await goalPoint(page))!, touch);
  await expect.poll(async () => (await state(page)).dialog, { timeout: 15000 }).toBe(true);
  await playUntil(page, (s) => s.scene === 'Town', touch, 100);
  if (touch) return;
  // keyboard route: down along the coast to the canal row, then east
  await page.goto('/continental-drift/?start=Sail&goal=1');
  await waitForNos(page);
  let talked = false;
  await page.keyboard.down('ArrowDown');
  await expect.poll(async () => (await player(page))!.y, { timeout: 15000 }).toBeGreaterThanOrEqual(24);
  await page.keyboard.up('ArrowDown');
  await page.keyboard.down('ArrowRight');
  for (let i = 0; i < 80 && !talked; i++) {
    talked = (await state(page)).dialog;
    if (!talked) await page.waitForTimeout(100);
  }
  await page.keyboard.up('ArrowRight');
  expect(talked).toBe(true);
});
