import { test, expect, type Page } from '@playwright/test';
import { dragPiece, piece, playUntil, state, waitForNos } from '../../../../tests/e2e/helpers';

const hint = (page: Page) =>
  page.evaluate(() => (window as unknown as { __nos: { hint(): boolean | null } }).__nos.hint());

test.describe('휴대폰 가로 (주소창 보임, 844x340)', () => {
  test.use({ viewport: { width: 844, height: 340 }, hasTouch: true, isMobile: true });

  test('@e2e 1배 아래로 줄어 화면에 다 들어오고, 손가락으로 대륙을 맞출 수 있다', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'one run is enough');
    await page.goto('/continental-drift/?start=Puzzle&phases=fossil');
    await waitForNos(page);
    const box = (await page.locator('#game canvas').boundingBox())!;
    expect(box.width).toBeLessThanOrEqual(844);
    expect(box.height).toBeLessThanOrEqual(340);
    expect(Math.round(box.height)).toBe(340);
    const scroll = await page.evaluate(() => [
      document.documentElement.scrollWidth <= innerWidth,
      document.documentElement.scrollHeight <= innerHeight,
    ]);
    expect(scroll).toEqual([true, true]);
    expect((await state(page)).rotate).toBe(false);
    await playUntil(page, (s) => s.phase === 'fossil' && !s.dialog, true);
    await dragPiece(page, 'india', 'target', true);
    expect((await piece(page, 'india'))!.snapped).toBe(true);
  });
});

test.describe('휴대폰 세로 (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('@e2e 세로로 들면 가로로 돌려 달라는 안내가 덮는다', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'one run is enough');
    await page.goto('/continental-drift/');
    await waitForNos(page);
    await expect.poll(async () => (await state(page)).rotate).toBe(true);
  });
});

test('@e2e 마우스로 하는 PC의 세로로 긴 창에는 돌려 달라는 안내가 없다', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one run is enough');
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto('/continental-drift/');
  await waitForNos(page);
  expect((await state(page)).rotate).toBe(false);
});

test('@e2e 지도 퍼즐의 노란 자리 표시는 30초 동안 손을 못 대고 있어야 나온다', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one run is enough');
  test.setTimeout(120_000);
  await page.goto('/continental-drift/?start=Puzzle&phases=fossil');
  await waitForNos(page);
  await playUntil(page, (s) => s.phase === 'fossil' && !s.dialog, false);
  expect(await hint(page)).toBe(false);
  await page.waitForTimeout(20_000);
  expect(await hint(page)).toBe(false);
  await expect.poll(() => hint(page), { timeout: 20_000, intervals: [500] }).toBe(true);
  // fitting a piece starts the count again
  await dragPiece(page, 'india', 'target', false);
  expect((await piece(page, 'india'))!.snapped).toBe(true);
  const s = await state(page);
  if (s.phase === 'fossil' && !s.dialog) expect(await hint(page)).toBe(false);
});
