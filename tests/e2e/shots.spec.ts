import { test, type Page } from '@playwright/test';
import { isTouch, playUntil, state, waitForNos, type NosState } from './helpers';

const shot = (page: Page, project: string, name: string) =>
  page.screenshot({ path: `test-results/screens/${project}-${name}.png` });

/** Plays from the title and takes a screenshot at each named moment. */
test('@shots 주요 장면 스크린샷', async ({ page }, info) => {
  test.setTimeout(900_000);
  const touch = isTouch(info.project.name);
  const p = info.project.name;
  await page.goto('/continental-drift/?steady=1');
  await waitForNos(page);
  await page.waitForTimeout(400);
  await shot(page, p, 'title');

  const moments: [string, (s: NosState) => boolean][] = [
    ['town-lab-intro', (s) => s.scene === 'Town' && s.dialog],
    ['town-lab', (s) => s.scene === 'Town' && !s.dialog],
    ['puzzle-coast', (s) => s.phase === 'coast' && !s.dialog],
    ['town-port-dialog', (s) => s.scene === 'Town' && s.dialog],
    ['sail', (s) => s.scene === 'Sail' && !s.dialog],
    ['town-india-scientist', (s) => s.scene === 'Town' && s.dialog && s.guide === null],
    ['dig', (s) => s.scene === 'Dig' && !s.dialog],
    ['sail-return', (s) => s.scene === 'Sail'],
    ['puzzle-fossil', (s) => s.phase === 'fossil' && !s.dialog],
    ['scratch', (s) => s.scene === 'Scratch' && !s.dialog],
    ['puzzle-glacier', (s) => s.phase === 'glacier' && !s.dialog],
    ['strata', (s) => s.scene === 'Strata' && !s.dialog],
    ['puzzle-mountain', (s) => s.phase === 'mountain' && !s.dialog],
    ['debate-choice', (s) => s.scene === 'Debate' && s.choice],
    ['survey', (s) => s.scene === 'Survey' && !s.dialog],
    ['seafloor', (s) => s.phase === 'stripes' && !s.dialog],
    ['ending', (s) => s.scene === 'Ending' && s.dialog],
  ];
  for (const [name, pred] of moments) {
    const reached = await playUntil(page, pred, touch, 1500).catch(() => null);
    if (!reached) continue;
    await page.waitForTimeout(name === 'sail' ? 1500 : 300);
    await shot(page, p, name);
    if ((await state(page)).scene === 'Ending') break;
  }
  await playUntil(page, () => false, touch, 400).catch(() => null);
  await page.waitForURL('**/continental-drift/about/');
  await page.screenshot({ path: `test-results/screens/${p}-about.png`, fullPage: true });
  await page.goto('/');
  await page.screenshot({ path: `test-results/screens/${p}-home.png` });
});
