import { rasterizeRings, outline, dotted, fillHoles } from '../../scripts/map/raster';

const count = (m: Uint8Array) => [...m].filter((v) => v).length;

test('정사각형 고리는 안쪽 픽셀만 칠한다', () => {
  const m = rasterizeRings([[[1, 1], [5, 1], [5, 5], [1, 5], [1, 1]]], 8, 8);
  expect(m[2 * 8 + 2]).toBe(1);
  expect(m[0]).toBe(0);
  expect(count(m)).toBe(16);
});
test('구멍(안쪽 고리)은 짝홀 규칙으로 비운다', () => {
  const m = rasterizeRings([[[0, 0], [8, 0], [8, 8], [0, 8], [0, 0]], [[3, 3], [5, 3], [5, 5], [3, 5], [3, 3]]], 8, 8);
  expect(m[3 * 8 + 3]).toBe(0);
  expect(m[1 * 8 + 1]).toBe(1);
});
test('윤곽은 바다에 닿은 땅 픽셀, 점선은 그 절반쯤', () => {
  const m = rasterizeRings([[[1, 1], [5, 1], [5, 5], [1, 5], [1, 1]]], 8, 8);
  const o = outline(m, 8, 8);
  expect(count(o)).toBe(12);
  expect(count(dotted(o, 8, 8))).toBe(6);
});

test('가장자리에 닿지 않는 작은 구멍만 메운다', () => {
  const m = rasterizeRings([[[0, 0], [8, 0], [8, 8], [0, 8], [0, 0]], [[3, 3], [5, 3], [5, 5], [3, 5], [3, 3]]], 8, 8);
  expect(fillHoles(m, 8, 8, 4)[3 * 8 + 3]).toBe(1);
  expect(fillHoles(m, 8, 8, 3)[3 * 8 + 3]).toBe(0);
});
