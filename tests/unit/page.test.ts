import { layoutPage } from '../../src/script/page';
import { galmuriMeasure } from '../../src/script/measure';
import { readFileSync } from 'node:fs';
import { parseScript } from '../../src/script/parse';
import { SUMMARY } from '../../src/game/common/layout';

const m = (s: string) => [...s].length * 10;

test('첫 제목은 창 제목, 나머지 제목·문단·목록은 줄로, 링크는 버튼으로', () => {
  const r = layoutPage('### 정리\n\n본문 하나\n\n### 소제목\n\n- 가나 **다라**\n- 마바\n\n[다시](/a/)\n[목록](/)', m, 100, 20);
  expect(r.title).toBe('정리');
  expect(r.links).toEqual([
    { label: '다시', href: '/a/' },
    { label: '목록', href: '/' },
  ]);
  expect(r.pages).toHaveLength(1);
  expect(r.pages[0].map((x) => [x.kind, x.text])).toEqual([
    ['p', '본문 하나'],
    ['gap', ''],
    ['h', '소제목'],
    ['li', '가나 다라'],
    ['li', '마바'],
  ]);
});

test('목록 줄이 넘치면 들여 쓴 이어지는 줄이 된다', () => {
  const r = layoutPage('### t\n\n- 가나다 라마바', m, 60, 20);
  const rows = r.pages[0];
  expect(rows.map((x) => x.text)).toEqual(['가나다', '라마바']);
  expect(rows[0].bullet).toBe(true);
  expect(rows[1].bullet).toBeFalsy();
  expect(rows[1].indent).toBe(rows[0].indent);
  expect(rows[0].indent).toBeGreaterThan(0);
});

test('제목 아래 첫 덩어리는 제목과 같은 쪽에 놓인다', () => {
  const r = layoutPage('### t\n\n가\n\n나\n\n### 다음\n\n- 라 마', m, 20, 5);
  const last = r.pages[r.pages.length - 1].map((x) => x.text);
  expect(last).toEqual(['다음', '라', '마']);
});

test('제목은 쪽 끝에 홀로 남지 않고, 쪽 첫 줄은 빈 줄이 아니다', () => {
  const r = layoutPage('### t\n\n가\n\n나\n\n### 다음\n\n라', m, 100, 4);
  for (const p of r.pages) {
    expect(p[0].kind).not.toBe('gap');
    expect(p[p.length - 1].kind).not.toBe('gap');
    expect(p[p.length - 1].kind).not.toBe('h');
    expect(p.length).toBeLessThanOrEqual(4);
  }
  expect(r.pages.flat().filter((x) => x.kind !== 'gap').map((x) => x.text)).toEqual(['가', '나', '다음', '라']);
});

test('한 쪽보다 긴 문단은 쪽을 넘겨 이어진다', () => {
  const r = layoutPage('### t\n\n가 나 다 라 마', m, 10, 2);
  expect(r.pages.map((p) => p.map((x) => x.text))).toEqual([['가', '나'], ['다', '라'], ['마']]);
});

test('실제 정리 페이지는 정리 창 쪽수 안에 들어간다', () => {
  const { script } = parseScript(readFileSync('activities/continental-drift/script.md', 'utf8'));
  const b = script.blocks.get('page-about');
  if (!b || b.kind !== 'page') throw new Error('page-about');
  const r = layoutPage(b.markdown, galmuriMeasure, SUMMARY.textW, SUMMARY.rows);
  expect(r.pages.length).toBeGreaterThan(1);
  expect(r.pages.length).toBeLessThanOrEqual(SUMMARY.maxPages);
  expect(r.links.length).toBe(2);
});
