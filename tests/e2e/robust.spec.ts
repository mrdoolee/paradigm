import { test, expect } from '@playwright/test';
import { dragPiece, isTouch, piece, playUntil, state, waitForNos } from './helpers';

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
    if ((await state(page)).scene === 'Puzzle') break;
  }
  const s = await state(page);
  expect(s.scene).toBe('Puzzle');
  expect(s.choiceCount).toBe(before + 1);
});
