import { DialogQueue, PageCursor } from '../../src/game/common/dialogQueue';

test('두 번째 작업은 첫 번째가 끝난 뒤에 시작한다', async () => {
  const q = new DialogQueue();
  const log: string[] = [];
  let release!: () => void;
  const a = q.enqueue(
    () =>
      new Promise<void>((r) => {
        log.push('a-start');
        release = () => {
          log.push('a-end');
          r();
        };
      }),
  );
  const b = q.enqueue(async () => {
    log.push('b-start');
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(log).toEqual(['a-start']);
  expect(q.busy).toBe(true);
  release();
  await a;
  await b;
  expect(log).toEqual(['a-start', 'a-end', 'b-start']);
  expect(q.busy).toBe(false);
});

test('같은 프레임 두 번 넘기기는 한 쪽만 넘긴다', () => {
  const c = new PageCursor([[['1'], ['2']], [['3']]]);
  expect(c.current()).toEqual({ speechIndex: 0, page: ['1'], pageNo: 1, pageCount: 2 });
  expect(c.advance(10)).toBe('next');
  expect(c.advance(10)).toBe('ignored');
  expect(c.current().page).toEqual(['2']);
  expect(c.advance(11)).toBe('next');
  expect(c.current()).toEqual({ speechIndex: 1, page: ['3'], pageNo: 1, pageCount: 1 });
  expect(c.advance(12)).toBe('done');
  expect(c.advance(13)).toBe('ignored');
});
