// Town maps (activities/continental-drift/towns/*.json) and the shared tile layout.
import lab from '../../../activities/continental-drift/towns/lab.json';
import india from '../../../activities/continental-drift/towns/india.json';
import australia from '../../../activities/continental-drift/towns/australia.json';
import africa from '../../../activities/continental-drift/towns/africa.json';
import type { TownId } from './run';

export type ThingKind = 'table' | 'port' | 'npc' | 'field' | 'aide' | 'boat';

export interface Thing {
  id: string;
  kind: ThingKind;
  cell: [number, number];
  /** line-* anchor drawn above the thing */
  label?: string;
  /** dialogue anchor said when the thing is looked at */
  talk?: string;
}

export interface TownDef {
  id: TownId;
  ground: string;
  walkable: string;
  rows: string[];
  spawn: Record<string, [number, number]>;
  things: Thing[];
}

export const TILE = 16;
/** Town maps start under the top guide bar. */
export const TOWN_ORIGIN = { x: 0, y: 22 };

export const TOWNS: Record<TownId, TownDef> = {
  lab: lab as unknown as TownDef,
  india: india as unknown as TownDef,
  australia: australia as unknown as TownDef,
  africa: africa as unknown as TownDef,
};
