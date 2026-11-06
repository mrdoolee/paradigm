import { padDirs, sideRoom, PAD_MIN_ROOM } from '../../src/engine/pad';
import { pickZoom } from '../../src/engine/screen';

test('십자 버튼: 가운데 가까이는 아무 방향도 아니다', () => {
  expect(padDirs(0, 0, 10)).toEqual([]);
  expect(padDirs(5, -5, 10)).toEqual([]);
});
test('십자 버튼: 네 방향', () => {
  expect(padDirs(40, 0, 10)).toEqual(['right']);
  expect(padDirs(-40, 0, 10)).toEqual(['left']);
  expect(padDirs(0, -40, 10)).toEqual(['up']);
  expect(padDirs(0, 40, 10)).toEqual(['down']);
  expect(padDirs(40, 10, 10)).toEqual(['right']);
});
test('십자 버튼: 대각선은 두 방향을 함께 누른다', () => {
  expect(padDirs(30, 30, 10).sort()).toEqual(['down', 'right']);
  expect(padDirs(-30, -30, 10).sort()).toEqual(['left', 'up']);
  expect(padDirs(30, -30, 10).sort()).toEqual(['right', 'up']);
  expect(padDirs(-30, 30, 10).sort()).toEqual(['down', 'left']);
});
test('휴대폰 가로 화면에는 좌우에 버튼 자리가 있고, 태블릿에는 없다 (PC는 터치 화면이 아니라 숨김)', () => {
  const room = (w: number, h: number) => sideRoom(w, pickZoom(w, h));
  for (const [w, h] of [[844, 340], [667, 330], [915, 356], [800, 360]]) expect(room(w, h)).toBeGreaterThanOrEqual(PAD_MIN_ROOM);
  expect(room(1024, 768)).toBeLessThan(PAD_MIN_ROOM);
});
