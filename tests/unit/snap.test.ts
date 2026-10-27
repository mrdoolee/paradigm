import { trySnap, clampToArea, snapSteps } from '../../src/game/common/snap';

test('반경 안이면 정답 자리, 밖이면 null', () => {
  expect(trySnap({ x: 107, y: 206 }, { x: 100, y: 200 }, 10)).toEqual({ x: 100, y: 200 });
  expect(trySnap({ x: 108, y: 207 }, { x: 100, y: 200 }, 10)).toBeNull();
  expect(trySnap({ x: 110, y: 200 }, { x: 100, y: 200 }, 10)).toEqual({ x: 100, y: 200 });
});
test('퍼즐 영역 밖으로 끌면 그림 전체가 영역 안에 남는다', () => {
  const area = { x: 0, y: 22, w: 480, h: 218 };
  expect(clampToArea({ x: -30, y: 300 }, { w: 40, h: 50 }, area)).toEqual({ x: 0, y: 190 });
  expect(clampToArea({ x: 470, y: 0 }, { w: 40, h: 50 }, area)).toEqual({ x: 440, y: 22 });
});
test('착 붙는 움직임은 정수 칸 n단계, 마지막은 정답 자리', () => {
  expect(snapSteps({ x: 0, y: 0 }, { x: 9, y: -3 }, 3)).toEqual([{ x: 3, y: -1 }, { x: 6, y: -2 }, { x: 9, y: -3 }]);
});
