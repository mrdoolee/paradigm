import { describe, expect, it } from 'vitest';
import { DigBoard, ScratchField, SurveyTrack, stripeAt } from '../../src/game/continental-drift/minigames/logic';

describe('DigBoard', () => {
  const fossils = [
    { x: 0, y: 0, w: 2, h: 2 },
    { x: 4, y: 1, w: 2, h: 2 },
  ];
  it('counts a fossil once all its cells are dug', () => {
    const b = new DigBoard(8, 4, fossils);
    expect(b.dig(0, 0)).toBe(true);
    expect(b.dig(0, 0)).toBe(false);
    b.dig(1, 0);
    b.dig(0, 1);
    expect(b.found()).toBe(0);
    b.dig(1, 1);
    expect(b.found()).toBe(1);
    expect(b.done()).toBe(false);
    for (const [x, y] of [[4, 1], [5, 1], [4, 2], [5, 2]]) b.dig(x, y);
    expect(b.done()).toBe(true);
  });
  it('ignores cells outside the board', () => {
    const b = new DigBoard(8, 4, fossils);
    expect(b.dig(-1, 0)).toBe(false);
    expect(b.dig(8, 0)).toBe(false);
    expect(b.isDug(8, 0)).toBe(false);
  });
});

describe('ScratchField', () => {
  it('reports the cleared ratio', () => {
    const f = new ScratchField(10, 10);
    let n = 0;
    for (let i = 0; i < 70; i++) n += f.rub(i % 10, Math.floor(i / 10), 0);
    expect(n).toBe(70);
    expect(f.ratio()).toBeCloseTo(0.7);
    expect(f.rub(0, 0, 0)).toBe(0);
  });
  it('clears a disc of radius r and clips at the edges', () => {
    const f = new ScratchField(10, 10);
    expect(f.rub(0, 0, 1)).toBe(3);
    expect(f.rub(5, 5, 1)).toBe(5);
  });
});

describe('stripeAt', () => {
  const stripes = [12, 7, 10];
  it('is normal at the ridge, reversed in the next band, mirrored on both sides', () => {
    expect(stripeAt(0, stripes)).toBe('normal');
    expect(stripeAt(11.9, stripes)).toBe('normal');
    expect(stripeAt(12, stripes)).toBe('reversed');
    expect(stripeAt(-12, stripes)).toBe('reversed');
    expect(stripeAt(19, stripes)).toBe('normal');
  });
});

describe('SurveyTrack', () => {
  it('merges marked spans in either direction', () => {
    const t = new SurveyTrack(0, 100);
    t.mark(0, 50);
    expect(t.coverage()).toBeCloseTo(0.5);
    t.mark(100, 40);
    expect(t.coverage()).toBeCloseTo(1);
  });
  it('ignores spans outside the range', () => {
    const t = new SurveyTrack(0, 100);
    t.mark(-50, -10);
    t.mark(150, 200);
    expect(t.coverage()).toBe(0);
  });
});
