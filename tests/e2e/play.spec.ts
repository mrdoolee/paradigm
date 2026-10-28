import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseScript } from '../../src/script/parse';
import { galmuriMeasure } from '../../src/script/measure';
import { advance, dragPiece, isTouch, piece, playUntil, state, waitForNos } from './helpers';

const WORLD = ['south-america', 'india', 'antarctica', 'australia', 'north-america', 'greenland', 'eurasia'];

test('@e2e 퍼즐 네 단계를 대화와 함께 끝내면 모든 대륙이 붙는다', async ({ page }, info) => {
  const touch = isTouch(info.project.name);
  await page.goto('/continental-drift/?start=Puzzle&phases=coast,fossil,glacier,mountain');
  await waitForNos(page);
  const seen: string[] = [];
  await playUntil(
    page,
    (s) => {
      if (s.phase && seen[seen.length - 1] !== s.phase) seen.push(s.phase);
      return s.scene === 'Town';
    },
    touch,
  );
  expect(seen).toEqual(['coast', 'fossil', 'glacier', 'mountain']);
});

test('@e2e 정답에서 먼 곳에 놓으면 그 자리에 머물고 단계가 그대로다', async ({ page }, info) => {
  const touch = isTouch(info.project.name);
  await page.goto('/continental-drift/?start=Puzzle');
  await waitForNos(page);
  await playUntil(page, (s) => s.phase === 'coast' && !s.dialog, touch);
  const sa = (await piece(page, 'south-america'))!;
  const off = { x: sa.target.x - 30, y: sa.target.y };
  await dragPiece(page, 'south-america', off, touch);
  const after = (await piece(page, 'south-america'))!;
  expect(after.snapped).toBe(false);
  expect(after.pos).toEqual(off);
  expect((await state(page)).phase).toBe('coast');
});

test('@e2e 대화창이 떠도 세계가 그대로이고 안내 띠는 숨는다', async ({ page }, info) => {
  const touch = isTouch(info.project.name);
  await page.goto('/continental-drift/?start=Puzzle');
  await waitForNos(page);
  const canvas = page.locator('#game canvas');
  await playUntil(page, (s) => s.phase === 'coast' && !s.dialog, touch);
  const before = await state(page);
  const boxBefore = await canvas.boundingBox();
  expect(before.guide).toBe('line-guide-coast');
  await dragPiece(page, 'south-america', 'target', touch);
  await page.waitForFunction(() => (window as unknown as { __nos: { state(): { dialog: boolean } } }).__nos.state().dialog);
  const during = await state(page);
  expect(during.world).toEqual(before.world);
  expect(await canvas.boundingBox()).toEqual(boxBefore);
  expect(during.guide).toBeNull();
  await playUntil(page, (s) => s.phase === 'fossil' && !s.dialog, touch);
  expect((await state(page)).guide).toBe('line-guide-fossil');
});

test('@e2e 대화 중에는 대륙을 끌 수 없다', async ({ page }, info) => {
  const touch = isTouch(info.project.name);
  await page.goto('/continental-drift/?start=Puzzle');
  await waitForNos(page);
  await page.waitForFunction(() => (window as unknown as { __nos: { state(): { dialog: boolean } } }).__nos.state().dialog);
  const sa = (await piece(page, 'south-america'))!;
  await dragPiece(page, 'south-america', { x: sa.pos.x + 40, y: sa.pos.y }, touch);
  // The press may advance the dialog (tap anywhere does), but the piece must not move.
  expect((await piece(page, 'south-america'))!.pos).toEqual(sa.pos);
});

test('@e2e 원고 글자 폭 표와 캔버스 글자 폭이 같다', async ({ page }) => {
  await page.goto('/continental-drift/?start=Puzzle');
  await waitForNos(page);
  const { script } = parseScript(readFileSync('activities/continental-drift/script.md', 'utf8'));
  const samples: string[] = [];
  for (const b of script.blocks.values()) {
    if (b.kind === 'dialogue') for (const s of b.speeches) samples.push(s.text);
    if (b.kind === 'line') samples.push(b.text);
    if (samples.length >= 20) break;
  }
  const canvasWidths = await page.evaluate(
    (xs) => xs.map((s) => (window as unknown as { __nos: { measureCanvas(s: string): number } }).__nos.measureCanvas(s)),
    samples,
  );
  expect(canvasWidths).toEqual(samples.map((s) => galmuriMeasure(s)));
});

test('@e2e 타이틀에서 누르면 연구실 마을이 시작된다', async ({ page }, info) => {
  const touch = isTouch(info.project.name);
  await page.goto('/continental-drift/');
  await waitForNos(page);
  expect((await state(page)).scene).toBe('Title');
  await advance(page, touch);
  await page.waitForFunction(() => (window as unknown as { __nos: { state(): { scene: string } } }).__nos.state().scene === 'Town');
});

export { WORLD };
