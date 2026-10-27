import { checkScript } from '../../src/script/check';

const m = (s: string) => [...s].length * 12;
const table = { sizePx: 12, ranges: [[0x20, 0x7e, 12], [0xac00, 0xd7a3, 12]] as [number, number, number][] };
const HEAD = `## 등장인물
| id | 이름 | 표시 | 초상 |
|---|---|---|---|
| aide | 조수 | 가상 인물 | - |
`;
const run = (body: string, required: Record<string, 'dialogue' | 'choices' | 'line' | 'page'> = {}, maxPages = 45) =>
  checkScript(HEAD + body, { required, maxPages, measure: m, table });
const codes = (r: ReturnType<typeof run>) => r.issues.map((i) => i.code);

test('필수 앵커가 없으면 MISSING_ANCHOR, 종류가 다르면 WRONG_KIND', () => {
  // Kind comes from the anchor prefix, so a code list expecting another kind is caught.
  const r = run('\n## @line-title\n제목\n', { intro: 'dialogue', 'line-title': 'dialogue' });
  expect(codes(r)).toEqual(expect.arrayContaining(['MISSING_ANCHOR', 'WRONG_KIND']));
});

test('선택지 대상이 없거나 대화가 아니면 BAD_TARGET', () => {
  const r = run('\n## @choice-q\n- 가 -> @nowhere\n- 나 -> @line-x\n\n## @line-x\n글\n');
  expect(r.issues.filter((i) => i.code === 'BAD_TARGET').map((i) => i.line)).toEqual([7, 8]);
});

test('말 하나가 3쪽이 되면 SPEECH_TOO_LONG, 2쪽은 통과', () => {
  // 368px / 12 = 30 chars per line, 3 lines per page.
  const two = '가'.repeat(30) + (' ' + '가'.repeat(29)).repeat(5);
  const three = two + ' 가';
  expect(codes(run(`\n## @a\naide: ${two}\n`))).not.toContain('SPEECH_TOO_LONG');
  const r = run(`\n## @a\naide: ${three}\n`);
  expect(r.issues.find((i) => i.code === 'SPEECH_TOO_LONG')).toMatchObject({ line: 7 });
});

test('안내 띠 글이 424px을 넘으면 GUIDE_TOO_WIDE', () => {
  expect(codes(run(`\n## @line-guide-x\n${'가'.repeat(35)}\n`))).not.toContain('GUIDE_TOO_WIDE');
  const r = run(`\n## @line-guide-x\n${'가'.repeat(36)}\n`);
  expect(r.issues.find((i) => i.code === 'GUIDE_TOO_WIDE')).toMatchObject({ line: 7 });
});

test('대화 쪽 수 합이 상한을 넘으면 TOTAL_PAGES, totalPages와 앵커별 쪽 수를 돌려준다', () => {
  const r = run('\n## @a\naide: 하나\naide: 둘\n\n## @b\naide: 셋\n', {}, 2);
  expect(r.totalPages).toBe(3);
  expect(r.pagesByAnchor).toEqual({ a: 2, b: 1 });
  expect(codes(r)).toContain('TOTAL_PAGES');
});

test('글꼴에 없는 글자는 MISSING_GLYPH와 그 글자', () => {
  const r = run('\n## @a\naide: 그는 “아니다”라고\n');
  expect(r.issues.find((i) => i.code === 'MISSING_GLYPH')).toMatchObject({ line: 7, detail: '“ ”' });
});

test('선택지 글이 176px을 넘으면 CHOICE_TOO_WIDE', () => {
  const r = run(`\n## @choice-q\n- ${'가'.repeat(15)} -> @a\n\n## @a\naide: 말\n`);
  expect(codes(r)).toContain('CHOICE_TOO_WIDE');
});
