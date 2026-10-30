import { parseScript } from '../../src/engine/script/parse';

const SRC = `<!-- 안내 -->
# 원고
## 등장인물
| id | 이름 | 표시 | 초상 |
|---|---|---|---|
| aide | 조수 | 가상 인물 | aide |
| narr | | - | - |

## @intro
aide: 첫 말
narr: 해설

## @choice-why
- 줄어서 -> @reply-a
- 모르겠다 -> @reply-b

## @line-guide-coast
남아메리카를 끌어 보세요

## @page-about
### 소제목
본문
`;

test('네 종류 블록과 등장인물을 읽는다', () => {
  const { script, errors } = parseScript(SRC);
  expect(errors).toEqual([]);
  expect(script.characters.get('aide')).toEqual({ id: 'aide', name: '조수', mark: '가상 인물', portrait: 'aide' });
  expect(script.characters.get('narr')).toEqual({ id: 'narr', name: '', mark: null, portrait: null });
  expect(script.blocks.get('intro')).toMatchObject({
    kind: 'dialogue',
    line: 9,
    speeches: [
      { speaker: 'aide', text: '첫 말', line: 10 },
      { speaker: 'narr', text: '해설', line: 11 },
    ],
  });
  expect(script.blocks.get('choice-why')).toMatchObject({
    kind: 'choices',
    choices: [
      { label: '줄어서', target: 'reply-a', line: 14 },
      { label: '모르겠다', target: 'reply-b', line: 15 },
    ],
  });
  expect(script.blocks.get('line-guide-coast')).toMatchObject({ kind: 'line', text: '남아메리카를 끌어 보세요' });
  expect(script.blocks.get('page-about')).toMatchObject({ kind: 'page', markdown: '### 소제목\n본문' });
});

test('형식 오류를 줄 번호와 함께 모은다', () => {
  const bad = SRC.replace('narr: 해설', '해설만')
    .replace('aide: 첫 말', 'ghost: 누구')
    .replace('- 모르겠다 -> @reply-b', '- 모르겠다')
    .replace('가상 인물 | aide', '상상 인물 | aide')
    .replace('남아메리카를 끌어 보세요', '한 줄\n두 줄');
  const codes = parseScript(bad).errors.map((e) => [e.code, e.line]);
  expect(codes).toEqual(
    expect.arrayContaining([
      ['BAD_MARK', 6],
      ['UNKNOWN_SPEAKER', 10],
      ['BAD_SPEECH', 11],
      ['BAD_CHOICE', 15],
      ['LINE_NOT_SINGLE', 19],
    ]),
  );
});

test('같은 앵커가 두 번이면 DUP_ANCHOR, 빈 블록은 EMPTY_BLOCK', () => {
  const codes = parseScript(SRC + '\n## @intro\naide: 또\n\n## @empty\n').errors.map((e) => e.code);
  expect(codes).toContain('DUP_ANCHOR');
  expect(codes).toContain('EMPTY_BLOCK');
});

test('등장인물 표가 없으면 NO_CHARACTERS', () => {
  expect(parseScript('## @intro\naide: 말\n').errors.map((e) => e.code)).toContain('NO_CHARACTERS');
});

test('여러 줄 주석은 무시하고 줄 번호는 그대로 센다', () => {
  const src = SRC.replace('<!-- 안내 -->', '<!--\n안내\n-->');
  expect(parseScript(src).script.blocks.get('intro')!.line).toBe(11);
});
