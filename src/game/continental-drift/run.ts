// The order of the whole activity as plain data, and the one in-memory object that tracks it.
// Scenes call run.complete(kind) when they finish and then open the next scene.

export type PortId = 'hamburg' | 'mumbai' | 'sydney' | 'capetown' | 'newyork';
export type TownId = 'lab' | 'india' | 'australia' | 'africa';
export type FieldGame = 'Dig' | 'Scratch' | 'Strata';
export type WorldPhase = 'coast' | 'fossil' | 'glacier' | 'mountain';

export type Goal =
  | { kind: 'table'; phase: WorldPhase }
  | { kind: 'sail'; port: PortId }
  | { kind: 'talk'; town: TownId }
  | { kind: 'field'; game: FieldGame }
  | { kind: 'debate' }
  | { kind: 'survey' }
  | { kind: 'stripes' }
  | { kind: 'ending' };

export const ROUTE: Goal[] = [
  { kind: 'table', phase: 'coast' },
  { kind: 'sail', port: 'mumbai' },
  { kind: 'talk', town: 'india' },
  { kind: 'field', game: 'Dig' },
  { kind: 'table', phase: 'fossil' },
  { kind: 'sail', port: 'sydney' },
  { kind: 'talk', town: 'australia' },
  { kind: 'field', game: 'Scratch' },
  { kind: 'table', phase: 'glacier' },
  { kind: 'sail', port: 'capetown' },
  { kind: 'talk', town: 'africa' },
  { kind: 'field', game: 'Strata' },
  { kind: 'table', phase: 'mountain' },
  { kind: 'sail', port: 'newyork' },
  { kind: 'debate' },
  { kind: 'survey' },
  { kind: 'stripes' },
  { kind: 'ending' },
];

export const TOWN_OF_PORT: Record<Exclude<PortId, 'newyork'>, TownId> = {
  hamburg: 'lab',
  mumbai: 'india',
  sydney: 'australia',
  capetown: 'africa',
};

export class Run {
  private i: number;

  constructor(start = 0) {
    this.i = Math.max(0, Math.min(start, ROUTE.length - 1));
  }

  get index(): number {
    return this.i;
  }

  get goal(): Goal {
    return ROUTE[this.i];
  }

  /** Moves on only if the current goal is of this kind, so a double trigger does nothing. */
  complete(kind: Goal['kind']): void {
    if (this.goal.kind !== kind || this.i >= ROUTE.length - 1) return;
    this.i++;
  }

  evidence(): number {
    return ROUTE.slice(0, this.i).filter((g) => g.kind === 'field').length;
  }

  portStatus(p: PortId): 'next' | 'visited' | 'closed' {
    const g = this.goal;
    if (g.kind === 'sail' && g.port === p) return 'next';
    if (p === 'hamburg') return 'visited';
    return this.visitedPorts().includes(p) ? 'visited' : 'closed';
  }

  visitedPorts(): PortId[] {
    const out: PortId[] = ['hamburg'];
    for (const g of ROUTE.slice(0, this.i)) if (g.kind === 'sail') out.push(g.port);
    return out;
  }
}

/** Dev shortcut ?evidence=n: the first table after the nth field (n = 0 is the very start). */
export function runFromStart(s: string | null): Run {
  const n = Math.max(0, Math.min(3, Number(s) || 0));
  if (n === 0) return new Run(0);
  let fields = 0;
  for (let i = 0; i < ROUTE.length; i++) {
    if (ROUTE[i].kind === 'field' && ++fields === n) return new Run(i + 1);
  }
  return new Run(0);
}
