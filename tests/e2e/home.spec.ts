import { expect, test } from '@playwright/test';
import { readdirSync, existsSync } from 'node:fs';

const activities = readdirSync('activities').filter((id) => existsSync(`activities/${id}/script.md`));

test('@e2e 첫 화면: 주제마다 카드 하나, 첫 카드가 골라져 있고 방향키와 Space로 들어간다', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('.game');
  await expect(cards).toHaveCount(activities.length);
  await expect(cards.first()).toHaveClass(/is-selected/);
  for (const id of activities) await expect(page.locator(`.game[href="/${id}/"]`)).toHaveCount(1);
  // the logo images loaded (not broken)
  for (const img of await page.locator('.logo img').all()) expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  await page.keyboard.press('ArrowDown');
  await expect(cards.first()).toBeFocused();
  await page.screenshot({ path: `test-results/screens/${test.info().project.name}-landing.png`, fullPage: true });
  await page.keyboard.press('Space');
  await expect(page).toHaveURL(new RegExp(`/${activities[0]}/$`));
  // Space with nothing focused works too
  await page.goto('/');
  await page.keyboard.press('Space');
  await expect(page).toHaveURL(new RegExp(`/${activities[0]}/$`));
});

test('@e2e 제작자 모달: 열면 스크롤이 막히고, ✕·ESC·바깥 누르기로 닫히며 고른 카드는 그대로다', async ({ page }) => {
  await page.goto('/');
  const backdrop = page.locator('#credit-backdrop');
  const dialog = page.getByRole('dialog');
  const selectedBefore = await page.locator('.game.is-selected').getAttribute('href');

  const open = async () => {
    await page.locator('#credit-open').click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');
  };
  const closed = async () => {
    await expect(backdrop).toBeHidden();
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');
    await expect(page.locator('#credit-open')).toBeFocused();
    expect(await page.locator('.game.is-selected').getAttribute('href')).toBe(selectedBefore);
  };

  await open();
  await expect(page.getByRole('button', { name: '닫기' })).toBeFocused();
  await page.screenshot({ path: `test-results/screens/${test.info().project.name}-landing-modal.png` });
  // arrow keys do nothing to the list while the dialog is open
  await page.keyboard.press('ArrowDown');
  await page.getByRole('button', { name: '닫기' }).click();
  await closed();

  await open();
  await page.keyboard.press('Escape');
  await closed();

  await open();
  await backdrop.click({ position: { x: 5, y: 5 } });
  await closed();

  // links open in a new tab
  await open();
  for (const a of await dialog.locator('a').all()) await expect(a).toHaveAttribute('target', '_blank');
});
