import { test, expect } from '@playwright/test';
import { isTouch, state, tapAt, waitForNos } from '../../../../tests/e2e/helpers';

// The sound toggle sits at the right end of the top bar (virtual 480x360 screen).
const TOGGLE = { x: 469, y: 11 };

const musicIs = (page: import('@playwright/test').Page, name: string | null) =>
  expect.poll(async () => (await state(page)).music, { timeout: 15_000 }).toBe(name);

test('@e2e 소리는 처음엔 꺼져 있고 배경음악도 내려받지 않는다', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (r) => {
    // dev server also asks for tiny ?import url modules; only real audio fetches count
    if (r.url().includes('/music/') && !r.url().includes('?import')) requested.push(r.url());
  });
  await page.goto('/continental-drift/');
  await waitForNos(page);
  await page.waitForTimeout(500);
  const s = await state(page);
  expect([s.sound, s.music]).toEqual([false, null]);
  expect(requested).toEqual([]);
});

test('@e2e 소리를 켜면 그 장소 곡이 나오고, 끄면 멈춘다', async ({ page }, info) => {
  const touch = isTouch(info.project.name);
  await page.goto('/continental-drift/');
  await waitForNos(page);
  await tapAt(page, TOGGLE, touch);
  expect((await state(page)).sound).toBe(true);
  await musicIs(page, 'lab');
  await tapAt(page, TOGGLE, touch);
  await musicIs(page, null);
});

for (const [query, name] of [
  ['start=Town&town=india', 'india'],
  ['start=Town&town=australia', 'australia'],
  ['start=Town&town=africa', 'africa'],
  ['start=Sail', 'sea'],
  ['start=Debate', 'debate'],
] as const) {
  test(`@e2e ${query} 에서는 ${name} 곡`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'one viewport is enough');
    await page.goto(`/continental-drift/?${query}`);
    await waitForNos(page);
    await tapAt(page, TOGGLE, false);
    await musicIs(page, name);
  });
}
