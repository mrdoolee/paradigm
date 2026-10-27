import { pickZoom } from '../../src/game/common/screen';

test('PC 1280x800과 태블릿 1024x768은 2배', () => {
  expect(pickZoom(1280, 800)).toBe(2);
  expect(pickZoom(1024, 768)).toBe(2);
});
test('2배가 안 들어가면 1배, 더 작아도 1배', () => {
  expect(pickZoom(1280, 690)).toBe(1);
  expect(pickZoom(959, 720)).toBe(1);
  expect(pickZoom(300, 200)).toBe(1);
});
test('큰 화면은 정수 배율로 커진다', () => {
  expect(pickZoom(1920, 1080)).toBe(3);
});
