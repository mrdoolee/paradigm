import { test, expect } from '@playwright/test';
import { dragPiece, isTouch, movable, piece, state, waitForNos } from './helpers';

test('@e2e 퍼즐 네 단계를 맞추면 모든 대륙이 붙는다', async ({ page }, info) => {
  const touch = isTouch(info.project.name);
  await page.goto('/continental-drift/?start=Puzzle');
  await waitForNos(page);
  const seen: string[] = [];
  for (let i = 0; i < 40; i++) {
    const s = await state(page);
    if (s.phase && seen[seen.length - 1] !== s.phase) seen.push(s.phase);
    if (s.phase === null && seen.length) break;
    const ids = await movable(page);
    if (ids.length) await dragPiece(page, ids[0], 'target', touch);
    else await page.waitForTimeout(200);
  }
  expect(seen).toEqual(['coast', 'fossil', 'glacier', 'mountain']);
  for (const id of ['south-america', 'india', 'antarctica', 'australia', 'north-america', 'greenland', 'eurasia']) {
    expect((await piece(page, id))!.snapped).toBe(true);
  }
});

test('@e2e 정답에서 먼 곳에 놓으면 그 자리에 머물고 단계가 그대로다', async ({ page }, info) => {
  const touch = isTouch(info.project.name);
  await page.goto('/continental-drift/?start=Puzzle');
  await waitForNos(page);
  await page.waitForFunction(() => (window as unknown as { __nos: { state(): { phase: string } } }).__nos.state().phase === 'coast');
  const sa = (await piece(page, 'south-america'))!;
  const off = { x: sa.target.x - 30, y: sa.target.y };
  await dragPiece(page, 'south-america', off, touch);
  const after = (await piece(page, 'south-america'))!;
  expect(after.snapped).toBe(false);
  expect(after.pos).toEqual(off);
  expect((await state(page)).phase).toBe('coast');
});
