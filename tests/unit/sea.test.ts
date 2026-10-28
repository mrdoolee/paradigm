import { describe, expect, it } from 'vitest';
import { PORTS, SEA, nearestSea, portCell, sailSeconds } from '../../src/game/continental-drift/sea';
import type { PortId } from '../../src/game/continental-drift/run';

const ids = Object.keys(PORTS) as PortId[];

describe('sailing grid', () => {
  it('puts every port on a sea cell', () => {
    for (const id of ids) {
      const c = portCell(id);
      expect(SEA.open(c.x, c.y), id).toBe(true);
    }
  });

  it('reaches every port from Hamburg within 30 seconds', () => {
    for (const id of ['mumbai', 'sydney', 'capetown', 'newyork'] as PortId[]) {
      const s = sailSeconds('hamburg', id);
      expect(s, id).toBeLessThanOrEqual(30);
    }
  });

  it('moves a press on land to a nearby sea cell', () => {
    const c = nearestSea({ x: 250, y: 130 })!; // middle of Africa
    expect(SEA.open(c.x, c.y)).toBe(true);
  });
});
