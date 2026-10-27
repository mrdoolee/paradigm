import { test, expect } from '@playwright/test';
import { advance, chooseIndex, isTouch, playUntil, state, waitForNos } from './helpers';

for (const i of [0, 1, 2]) {
  test(`@e2e 학회 선택지 ${i + 1}번을 골라도 해저 단계로 간다`, async ({ page }, info) => {
    const touch = isTouch(info.project.name);
    await page.goto('/continental-drift/?start=Debate');
    await waitForNos(page);
    await playUntil(page, (s) => s.choice, touch);
    const before = (await state(page)).choiceCount;
    await chooseIndex(page, i, 3, touch);
    expect((await state(page)).choiceCount).toBe(before + 1);
    const s = await playUntil(page, (s) => s.scene === 'Puzzle' && s.phase === 'stripes', touch);
    expect(s.choiceCount).toBe(before + 1);
  });
}

test('@e2e 줄무늬 세 조각을 맞추면 마무리로 간다', async ({ page }, info) => {
  const touch = isTouch(info.project.name);
  await page.goto('/continental-drift/?start=Puzzle&phases=stripes');
  await waitForNos(page);
  await playUntil(page, (s) => s.phase === 'stripes' && !s.dialog, touch);
  expect((await state(page)).guide).toBe('line-guide-stripes');
  await playUntil(page, (s) => s.phase === null && !s.dialog, touch);
});

test('@e2e 목록에서 시작해 끝까지 하면 정리 페이지가 나온다', async ({ page }, info) => {
  test.setTimeout(300_000);
  const touch = isTouch(info.project.name);
  await page.goto('/');
  const histStart = await page.evaluate(() => history.length);
  await page.locator('a.card').first().click();
  await waitForNos(page);
  expect((await state(page)).scene).toBe('Title');
  await advance(page, touch);
  const play = playUntil(page, () => false, touch, 2000).catch(() => null);
  await page.waitForURL('**/continental-drift/about/', { timeout: 280_000 });
  await play;
  await expect(page.locator('main#about h3').first()).toBeVisible();
  const links = page.locator('nav a.button');
  await expect(links).toHaveCount(2);
  // in-game navigation adds no history entries beyond the two page loads
  expect(await page.evaluate(() => history.length)).toBeLessThanOrEqual(histStart + 2);
  await links.first().click();
  await waitForNos(page);
  expect((await state(page)).scene).toBe('Title');
});
