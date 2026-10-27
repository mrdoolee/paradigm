import { wrapText, paginate, pagesFor } from '../../src/script/wrap';
import { makeTableMeasure, missingChars, galmuriMeasure } from '../../src/script/measure';

const m = (s: string) => [...s].length * 10;

test('어절 단위로 줄을 바꾼다', () => {
  expect(wrapText('해안선이 딱 맞잖아요', m, 60)).toEqual(['해안선이 딱', '맞잖아요']);
});
test('한 줄보다 긴 어절은 글자 단위로 끊는다', () => {
  expect(wrapText('가나다라마바사아', m, 30)).toEqual(['가나다', '라마바', '사아']);
});
test('줄 앞뒤 공백과 겹친 공백은 지운다', () => {
  expect(wrapText('  가나   다라  ', m, 100)).toEqual(['가나 다라']);
});
test('세 줄씩 쪽을 나눈다', () => {
  expect(paginate(['a', 'b', 'c', 'd'], 3)).toEqual([['a', 'b', 'c'], ['d']]);
  expect(pagesFor('가나 다라 마바 사아', m, 20, 2)).toEqual([['가나', '다라'], ['마바', '사아']]);
});
test('표에 있는 글자 폭을 더하고, 없는 글자를 찾아낸다', () => {
  const t = { sizePx: 12, ranges: [[0x20, 0x7e, 6], [0xac00, 0xd7a3, 12]] as [number, number, number][] };
  expect(makeTableMeasure(t)('가 a')).toBe(24);
  expect(missingChars(t, '가“나”“')).toEqual(['“', '”']);
});
test('실제 Galmuri11 표: 한글 음절 12, 공백 5', () => {
  expect(galmuriMeasure('가')).toBe(12);
  expect(galmuriMeasure('가 나')).toBe(29);
});
