import { findPath, gridFromRows, type Grid } from '../../src/game/common/grid';
import { TOWNS } from '../../src/game/continental-drift/towns';
import { checkScript } from '../../src/script/check';

const blocked = (id: keyof typeof TOWNS): Grid => {
  const def = TOWNS[id];
  const base = gridFromRows(def.rows, def.walkable);
  const things = new Set(def.things.map((t) => `${t.cell[0]},${t.cell[1]}`));
  return { w: base.w, h: base.h, open: (x, y) => base.open(x, y) && !things.has(`${x},${y}`) };
};

describe.each(Object.keys(TOWNS) as (keyof typeof TOWNS)[])('마을 %s', (id) => {
  const def = TOWNS[id];
  const g = blocked(id);

  test('지도는 30×21이고 쓰인 글자는 모두 그림이 있다', () => {
    expect(def.rows).toHaveLength(21);
    for (const r of def.rows) expect(r).toHaveLength(30);
    const known = new Set(['.', ',', '=', '~', 'T', 'p', '#', ...Object.keys(def.legend ?? {})]);
    for (const r of def.rows) for (const ch of r) expect(known.has(ch)).toBe(true);
  });

  test('소품 칸은 걸을 수 없다', () => {
    for (const ch of Object.keys(def.legend ?? {})) expect(def.walkable.includes(ch)).toBe(false);
  });

  test('모든 도착 자리에서 모든 사람·목표 옆 칸까지 걸어갈 수 있다', () => {
    for (const [name, [sx, sy]] of Object.entries(def.spawn)) {
      expect(g.open(sx, sy), `${id} spawn ${name}`).toBe(true);
      for (const t of def.things) {
        if (t.kind === 'boat') continue;
        const [tx, ty] = t.cell;
        const sides = [
          [tx + 1, ty],
          [tx - 1, ty],
          [tx, ty + 1],
          [tx, ty - 1],
        ].filter(([x, y]) => g.open(x, y));
        const ok = sides.some(([x, y]) => findPath(g, { x: sx, y: sy }, { x, y }) !== null);
        expect(ok, `${id}: ${name} -> ${t.id}`).toBe(true);
      }
    }
  });

  test('마을 사람은 그림 이름과 npc- 대사를 가진다', () => {
    for (const t of def.things.filter((x) => x.kind === 'folk')) {
      expect(t.sprite).toMatch(/^folk-/);
      expect(t.talk).toBe(`npc-${id}-${t.id}`);
    }
  });
});

test('골라 듣는 대사(npc-)는 원고 총량과 따로 센다', () => {
  const text = '## 등장인물\n\n| id | 이름 | 표시 | 초상 |\n|---|---|---|---|\n| a | 가 | 가상 인물 | - |\n\n## @x\na: 가\n\n## @npc-y\na: 나\n';
  const r = checkScript(text, { required: {}, maxPages: 1, maxOptionalPages: 0 });
  expect(r.totalPages).toBe(1);
  expect(r.optionalPages).toBe(1);
  expect(r.issues.map((i) => i.code)).toEqual(['OPTIONAL_PAGES']);
});
