import { test, expect } from '@playwright/test';
import { isTouch, state, tapAt, waitForNos } from '../../../../tests/e2e/helpers';

// The sound toggle sits at the right end of the top bar (virtual 480x360 screen).
const TOGGLE = { x: 469, y: 11 };

const musicIs = (page: import('@playwright/test').Page, name: string | null) =>
  expect.poll(async () => (await state(page)).music, { timeout: 15_000 }).toBe(name);

test('@e2e 소리는 처음엔 켜져 있고 제목 화면부터 연구실 곡이 나온다', async ({ page }) => {
  await page.goto('/continental-drift/');
  await waitForNos(page);
  expect((await state(page)).sound).toBe(true);
  await musicIs(page, 'lab');
});

test('@e2e 소리 단추로 끄면 곡이 멈추고, 다시 켜면 돌아온다', async ({ page }, info) => {
  const touch = isTouch(info.project.name);
  await page.goto('/continental-drift/');
  await waitForNos(page);
  await musicIs(page, 'lab');
  await tapAt(page, TOGGLE, touch);
  expect((await state(page)).sound).toBe(false);
  await musicIs(page, null);
  await tapAt(page, TOGGLE, touch);
  await musicIs(page, 'lab');
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
    await musicIs(page, name);
  });
}
