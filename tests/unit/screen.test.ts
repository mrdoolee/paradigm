import { VIEW_H, VIEW_W, pickZoom } from '../../src/engine/screen';

test('PC 1280x800과 태블릿 1024x768은 2배', () => {
  expect(pickZoom(1280, 800)).toBe(2);
  expect(pickZoom(1024, 768)).toBe(2);
});
test('2배가 안 들어가면 1배', () => {
  expect(pickZoom(1280, 690)).toBe(1);
  expect(pickZoom(959, 720)).toBe(1);
  expect(pickZoom(480, 360)).toBe(1);
});
test('큰 화면은 정수 배율로 커진다', () => {
  expect(pickZoom(1920, 1080)).toBe(3);
});
test('1배도 안 들어가는 휴대폰 가로 화면은 1배 아래로 줄여 화면에 다 들어간다', () => {
  for (const [w, h] of [
    [844, 340], // iPhone, Safari address bar shown
    [667, 330], // small iPhone
    [915, 356], // Android Chrome
    [300, 200],
  ]) {
    const z = pickZoom(w, h);
    expect(z).toBeLessThan(1);
    expect(VIEW_W * z).toBeLessThanOrEqual(w);
    expect(VIEW_H * z).toBeLessThanOrEqual(h);
  }
  expect(pickZoom(844, 340)).toBeCloseTo(340 / 360, 5);
});
