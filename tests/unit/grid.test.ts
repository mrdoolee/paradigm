import { describe, expect, it } from 'vitest';
import { findPath, gridFromRows, nearestOpen, pathLength } from '../../src/rpg/grid';

const ring = gridFromRows(['...', '.#.', '...'], '.');

describe('grid', () => {
  it('walks around a blocked centre in 4 steps', () => {
    const p = findPath(ring, { x: 0, y: 0 }, { x: 2, y: 2 })!;
    expect(p).toHaveLength(4);
    expect(p.at(-1)).toEqual({ x: 2, y: 2 });
    expect(p.some((c) => c.x === 1 && c.y === 1)).toBe(false);
  });

  it('does not cut corners when diagonal moves are allowed', () => {
    const p = findPath(ring, { x: 0, y: 0 }, { x: 2, y: 2 }, true)!;
    expect(p.length).toBeLessThanOrEqual(4);
    let prev = { x: 0, y: 0 };
    for (const c of p) {
      if (c.x !== prev.x && c.y !== prev.y) {
        expect(ring.open(c.x, prev.y) && ring.open(prev.x, c.y)).toBe(true);
      }
      prev = c;
    }
  });

  it('returns [] for the same cell and null when unreachable', () => {
    expect(findPath(ring, { x: 0, y: 0 }, { x: 0, y: 0 })).toEqual([]);
    const walled = gridFromRows(['.#.', '.#.', '.#.'], '.');
    expect(findPath(walled, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });

  it('treats out-of-range cells as blocked', () => {
    expect(ring.open(-1, 0)).toBe(false);
    expect(ring.open(3, 0)).toBe(false);
    expect(findPath(ring, { x: 0, y: 0 }, { x: 5, y: 5 })).toBeNull();
  });

  it('finds the open neighbour of a blocked target nearest to the walker', () => {
    expect(nearestOpen(ring, { x: 1, y: 1 }, { x: 0, y: 0 })).toEqual({ x: 1, y: 0 });
    expect(nearestOpen(ring, { x: 1, y: 1 }, { x: 2, y: 2 })).toEqual({ x: 2, y: 1 }); // tie: right side comes before below
    expect(nearestOpen(ring, { x: 0, y: 1 }, { x: 0, y: 0 })).toEqual({ x: 0, y: 1 });
  });

  it('is deterministic', () => {
    const a = findPath(ring, { x: 0, y: 0 }, { x: 2, y: 2 });
    const b = findPath(ring, { x: 0, y: 0 }, { x: 2, y: 2 });
    expect(a).toEqual(b);
  });

  it('measures diagonal steps as root 2', () => {
    expect(pathLength([{ x: 1, y: 0 }])).toBe(1);
    expect(pathLength([{ x: 1, y: 1 }])).toBeCloseTo(Math.SQRT2);
    expect(pathLength([{ x: 1, y: 0 }, { x: 2, y: 1 }])).toBeCloseTo(1 + Math.SQRT2);
  });
});
