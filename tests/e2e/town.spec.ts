import { expect, test } from '@playwright/test';
import { advance, goalPoint, isTouch, player, playUntil, state, tapAt, waitForNos } from './helpers';

test('@e2e 마을: 칸을 누르면 걸어가고, 대화 중엔 멈추고, 탁자에서 퍼즐이 열린다', async ({ page }, info) => {
  const touch = isTouch(info.project.name);
  await page.goto('/continental-drift/?start=Town');
  await waitForNos(page);
  // first visit: the intro dialog is open, the world must not move
  await expect.poll(async () => (await state(page)).dialog).toBe(true);
  const before = await player(page);
  if (!touch) await page.keyboard.press('ArrowRight');
  await tapAt(page, { x: 200, y: 22 + 10 * 16 + 8 }, touch); // also advances the dialog
  await page.waitForTimeout(400);
  expect(await player(page)).toEqual(before);
  await playUntil(page, (s) => !s.dialog, touch, 20);

  // walk by pressing a cell
  await tapAt(page, { x: 4 * 16 + 8, y: 22 + 10 * 16 + 8 }, touch);
  await expect.poll(() => player(page), { timeout: 5000 }).toEqual({ x: 4, y: 10 });

  if (!touch) {
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => player(page)).toEqual({ x: 5, y: 10 });
  }

  // the table is the goal: pressing it walks there and opens the puzzle
  const g = (await goalPoint(page))!;
  await tapAt(page, g, touch);
  await expect.poll(async () => (await state(page)).scene, { timeout: 8000 }).toBe('Puzzle');
});

test('@e2e 첫 한 바퀴: 해안선 → 항해 → 인도 → 화석 발굴 → 귀환 → 화석 단계', async ({ page }, info) => {
  test.setTimeout(180_000);
  const touch = isTouch(info.project.name);
  await page.goto('/continental-drift/?start=Town');
  await waitForNos(page);
  await playUntil(page, (s) => s.scene === 'Sail', touch, 200);
  await playUntil(page, (s) => s.scene === 'Town' && !s.dialog && (s.guide ?? '').includes('talk'), touch, 200);
  await playUntil(page, (s) => s.scene === 'Dig', touch, 200);
  await playUntil(page, (s) => s.scene === 'Sail', touch, 300);
  await playUntil(page, (s) => s.scene === 'Town', touch, 100);
  await playUntil(page, (s) => s.scene === 'Puzzle' && s.phase === 'fossil' && !s.dialog, touch, 200);
  const m = await page.evaluate(() => (window as unknown as { __nos: { movable(): string[]; piece(id: string): { snapped: boolean } } }).__nos);
  expect(m).toBeTruthy();
  const sa = await page.evaluate(() => (window as unknown as { __nos: { piece(id: string): { snapped: boolean } } }).__nos.piece('south-america'));
  expect(sa.snapped).toBe(true);
  void advance;
});
