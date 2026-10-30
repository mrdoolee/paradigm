import { describe, expect, it } from 'vitest';
import { ROUTE, Run, runFromStart } from '../../game/run';

describe('Run', () => {
  it('starts at the coast table', () => {
    expect(new Run().goal).toEqual({ kind: 'table', phase: 'coast' });
  });

  it('ignores a completion of the wrong kind', () => {
    const r = new Run();
    r.complete('sail');
    expect(r.index).toBe(0);
  });

  it('walks the whole route to the ending with three pieces of evidence', () => {
    const r = new Run();
    for (const g of ROUTE.slice(0, -1)) r.complete(g.kind);
    expect(r.goal.kind).toBe('ending');
    expect(r.evidence()).toBe(3);
  });

  it('opens ports one at a time', () => {
    const r = new Run();
    r.complete('table');
    expect(r.portStatus('mumbai')).toBe('next');
    expect(r.portStatus('sydney')).toBe('closed');
    expect(r.portStatus('newyork')).toBe('closed');
    expect(r.portStatus('hamburg')).toBe('visited');
    r.complete('sail');
    r.complete('talk');
    r.complete('field');
    expect(r.portStatus('mumbai')).toBe('visited');
    expect(r.evidence()).toBe(1);
    expect(r.visitedPorts()).toContain('mumbai');
  });

  it('opens New York only after the mountain table', () => {
    const r = new Run();
    while (!(r.goal.kind === 'sail' && r.goal.port === 'newyork')) {
      expect(r.portStatus('newyork')).toBe('closed');
      r.complete(r.goal.kind);
    }
    expect(r.portStatus('newyork')).toBe('next');
  });

  it('dev start: evidence n puts you at the table after the nth field', () => {
    expect(runFromStart('0').goal).toEqual({ kind: 'table', phase: 'coast' });
    expect(runFromStart('2').goal).toEqual({ kind: 'table', phase: 'glacier' });
    expect(runFromStart('3').goal).toEqual({ kind: 'table', phase: 'mountain' });
    expect(runFromStart(null).goal).toEqual({ kind: 'table', phase: 'coast' });
  });
});
