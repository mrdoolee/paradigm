import { test, expect } from '@playwright/test';

test('@e2e 게임 화면은 2배(960x720)이고 스크롤이 없다', async ({ page }) => {
  await page.goto('/continental-drift/');
  const canvas = page.locator('#game canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box && Math.round(box.width)).toBe(960);
  expect(box && Math.round(box.height)).toBe(720);
  const scroll = await page.evaluate(() => ({
    w: document.documentElement.scrollWidth <= window.innerWidth,
    h: document.documentElement.scrollHeight <= window.innerHeight,
  }));
  expect(scroll).toEqual({ w: true, h: true });
});
