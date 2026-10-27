import { test, type Page } from '@playwright/test';
import { isTouch, playUntil, state, waitForNos, type NosState } from './helpers';

const shot = (page: Page, project: string, name: string) =>
  page.screenshot({ path: `test-results/screens/${project}-${name}.png` });

/** Plays from the title and takes a screenshot at each named moment. */
test('@shots 주요 장면 스크린샷', async ({ page }, info) => {
  const touch = isTouch(info.project.name);
  const p = info.project.name;
  await page.goto('/continental-drift/?steady=1');
  await waitForNos(page);
  await page.waitForTimeout(400);
  await shot(page, p, 'title');

  const moments: [string, (s: NosState) => boolean][] = [
    ['puzzle-intro-dialog', (s) => s.scene === 'Puzzle' && s.phase === 'coast' && s.dialog],
    ['puzzle-coast', (s) => s.phase === 'coast' && !s.dialog],
    ['puzzle-coast-dialog', (s) => s.phase === 'coast' && s.dialog && s.guide === null],
    ['puzzle-fossil', (s) => s.phase === 'fossil' && !s.dialog],
    ['puzzle-glacier', (s) => s.phase === 'glacier' && !s.dialog],
    ['puzzle-mountain', (s) => s.phase === 'mountain' && !s.dialog],
    ['debate-choice', (s) => s.scene === 'Debate' && s.choice],
    ['seafloor', (s) => s.phase === 'stripes' && !s.dialog],
    ['ending', (s) => s.scene === 'Ending' && s.dialog],
  ];
  let introDone = false;
  for (const [name, pred] of moments) {
    if (name === 'puzzle-coast-dialog') {
      // the dialog that opens after South America snaps
      await playUntil(page, (s) => s.phase === 'coast' && s.dialog && introDone, touch).catch(() => null);
    } else {
      const reached = await playUntil(page, pred, touch, 400).catch(() => null);
      if (!reached) continue;
    }
    if (name === 'puzzle-coast') introDone = true;
    await page.waitForTimeout(300);
    await shot(page, p, name);
    const s = await state(page);
    if (s.scene === 'Ending') break;
  }
  await playUntil(page, () => false, touch, 400).catch(() => null);
  await page.waitForURL('**/continental-drift/about/');
  await page.screenshot({ path: `test-results/screens/${p}-about.png`, fullPage: true });
  await page.goto('/');
  await page.screenshot({ path: `test-results/screens/${p}-home.png` });
});
