import { test, expect } from '@playwright/test';
import { advance, chooseIndex, isTouch, playUntil, state, summary, tapAt, waitForNos } from './helpers';

for (const i of [0, 1, 2]) {
  test(`@e2e 학회 선택지 ${i + 1}번을 골라도 해저 조사로 간다`, async ({ page }, info) => {
    const touch = isTouch(info.project.name);
    await page.goto('/continental-drift/?start=Debate');
    await waitForNos(page);
    await playUntil(page, (s) => s.choice, touch);
    const before = (await state(page)).choiceCount;
    await chooseIndex(page, i, 3, touch);
    expect((await state(page)).choiceCount).toBe(before + 1);
    const s = await playUntil(page, (s) => s.scene === 'Survey', touch);
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

test('@e2e 목록에서 시작해 끝까지 하면 마지막 장면에서 정리 창이 나온다', async ({ page }, info) => {
  test.setTimeout(900_000);
  const touch = isTouch(info.project.name);
  await page.goto('/');
  const histStart = await page.evaluate(() => history.length);
  await page.locator('a.card').first().click();
  await waitForNos(page);
  expect((await state(page)).scene).toBe('Title');
  await advance(page, touch);
  const seen: string[] = [];
  await playUntil(
    page,
    (s) => {
      if (seen[seen.length - 1] !== s.scene) seen.push(s.scene);
      return s.scene === 'Summary';
    },
    touch,
    6000,
  );
  for (const scene of ['Town', 'Puzzle', 'Sail', 'Dig', 'Scratch', 'Strata', 'Debate', 'Survey', 'Ending']) expect(seen).toContain(scene);
  // the summary is a scene of the game page, not another page
  expect(new URL(page.url()).pathname).toBe('/continental-drift/');
  const first = (await summary(page))!;
  expect(first.page).toBe(0);
  expect(first.pages).toBeGreaterThan(1);
  for (let i = 1; i < first.pages; i++) {
    await tapAt(page, (await summary(page))!.next!, touch);
    await expect.poll(async () => (await summary(page))!.page).toBe(i);
  }
  const last = (await summary(page))!;
  expect(last.next).toBeNull();
  expect(last.links).toHaveLength(2);
  // in-game navigation adds no history entries beyond the game page load
  expect(await page.evaluate(() => history.length)).toBeLessThanOrEqual(histStart + 1);
  await tapAt(page, last.links[0], touch);
  await page.waitForLoadState();
  await waitForNos(page);
  await expect.poll(async () => (await state(page)).scene).toBe('Title');
});

test('@e2e 정리 창: 키보드로 쪽을 넘기고, 마지막 쪽에서만 버튼을 고른다', async ({ page }, info) => {
  test.skip(isTouch(info.project.name), 'keyboard only');
  await page.goto('/continental-drift/?start=Summary');
  await waitForNos(page);
  const s0 = (await summary(page))!;
  await page.keyboard.press('ArrowLeft');
  expect((await summary(page))!.page).toBe(0);
  for (let i = 0; i < s0.pages + 2; i++) await page.keyboard.press('Enter');
  expect((await summary(page))!.page).toBe(s0.pages - 1);
  // Enter mashing on the last page does not leave the game
  expect(new URL(page.url()).pathname).toBe('/continental-drift/');
  await page.keyboard.press('ArrowLeft');
  expect((await summary(page))!.page).toBe(s0.pages - 2);
});
