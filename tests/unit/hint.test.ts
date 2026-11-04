import { HintClock } from '../../src/engine/hint';

test('힌트는 셀 수 있는 시간이 정한 시간을 넘어야 보인다', () => {
  const h = new HintClock(30_000);
  expect(h.shown).toBe(false);
  for (let i = 0; i < 119; i++) h.tick(250, true);
  expect(h.shown).toBe(false);
  h.tick(250, true);
  expect(h.shown).toBe(true);
});
test('대화 중처럼 세지 않는 동안은 시간이 쌓이지 않는다', () => {
  const h = new HintClock(1_000);
  h.tick(5_000, false);
  expect(h.shown).toBe(false);
});
test('조각을 맞추거나 새 단계가 되면 다시 센다', () => {
  const h = new HintClock(1_000);
  h.tick(1_000, true);
  expect(h.shown).toBe(true);
  h.reset();
  expect(h.shown).toBe(false);
});
test('정한 시간이 0이면 처음부터 보인다', () => {
  expect(new HintClock(0).shown).toBe(true);
});
