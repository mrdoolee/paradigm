import { expect, test, type Page } from '@playwright/test';
import { player, state, waitForNos } from './helpers';

// Phone sizes are set here, so run once (desktop project) rather than once per project.
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'phone context made inside the test'));

async function phone(browser: import('@playwright/test').Browser, w = 844, h = 390) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  return { ctx, page: await ctx.newPage() };
}

/** Holds a pointer on the element (offset from its centre) for ms, like a thumb. */
async function hold(page: Page, sel: string, ms: number, dx = 0, dy = 0) {
  const box = (await page.locator(sel).boundingBox())!;
  const x = box.x + box.width / 2 + dx;
  const y = box.y + box.height / 2 + dy;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await page.waitForTimeout(ms);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await page.waitForTimeout(120);
}

test('@e2e 휴대폰 가로: 좌우 빈자리에 버튼이 보이고 게임을 가리지 않는다', async ({ browser }) => {
  const { ctx, page } = await phone(browser);
  await page.goto('/continental-drift/');
  await waitForNos(page);
  await expect(page.locator('.tp-left')).toBeVisible();
  await expect(page.locator('.tp-right')).toBeVisible();
  const canvas = (await page.locator('canvas').boundingBox())!;
  const left = (await page.locator('.tp-left .tp-dpad').boundingBox())!;
  const right = (await page.locator('.tp-a').boundingBox())!;
  expect(left.x + left.width).toBeLessThanOrEqual(canvas.x);
  expect(right.x).toBeGreaterThanOrEqual(canvas.x + canvas.width);
  await page.screenshot({ path: 'test-results/screens/phone-touchpad.png' });
  await ctx.close();
});

test('@e2e 휴대폰 가로: 확인 버튼으로 대화를 넘기고 십자 버튼으로 걷는다', async ({ browser }) => {
  const { ctx, page } = await phone(browser);
  await page.goto('/continental-drift/?start=Town');
  await waitForNos(page);
  await expect.poll(async () => (await state(page)).scene).toBe('Town');
  for (let i = 0; i < 40 && (await state(page)).dialog; i++) await hold(page, '.tp-a', 60);
  expect((await state(page)).dialog).toBe(false);
  const before = (await player(page))!;
  const r = (await page.locator('.tp-dpad').boundingBox())!;
  // hold right, then down, until the player has moved (a wall may block one way)
  await hold(page, '.tp-dpad', 700, r.width * 0.4, 0);
  await hold(page, '.tp-dpad', 700, 0, r.height * 0.4);
  const after = (await player(page))!;
  expect(after.x !== before.x || after.y !== before.y).toBe(true);
  await ctx.close();
});

test('@e2e PC·태블릿·휴대폰 세로에는 버튼이 없다', async ({ browser }) => {
  const pc = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const tablet = await browser.newContext({ viewport: { width: 1024, height: 768 }, isMobile: true, hasTouch: true });
  const upright = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const ctx of [pc, tablet, upright]) {
    const page = await ctx.newPage();
    await page.goto('/continental-drift/');
    await waitForNos(page);
    await expect(page.locator('.tp-left')).toBeHidden();
    await expect(page.locator('.tp-right')).toBeHidden();
    await ctx.close();
  }
});
