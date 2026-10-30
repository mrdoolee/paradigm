// Town maps (activities/continental-drift/towns/*.json) and the shared tile layout.
import lab from '../../../activities/continental-drift/towns/lab.json';
import india from '../../../activities/continental-drift/towns/india.json';
import australia from '../../../activities/continental-drift/towns/australia.json';
import africa from '../../../activities/continental-drift/towns/africa.json';
import type { TownId } from './run';

export type ThingKind = 'table' | 'port' | 'npc' | 'field' | 'aide' | 'boat' | 'folk';

export interface Thing {
  id: string;
  kind: ThingKind;
  cell: [number, number];
  /** line-* anchor drawn above the thing */
  label?: string;
  /** dialogue anchor said when the thing is looked at */
  talk?: string;
  /** townsfolk: character art `chars/<sprite>-down` */
  sprite?: string;
  /** townsfolk: a small animal that hops when spoken to */
  hop?: boolean;
  /** townsfolk: colour multiplied over the art, so a passer-by never looks like the goal (e.g. "#9ab8c8") */
  tint?: string;
}

export interface TownDef {
  id: TownId;
  walkable: string;
  /** map letters for this town's props (blocked cells), e.g. { "W": "well" } -> tile `town/<id>/well` */
  legend?: Record<string, string>;
  rows: string[];
  spawn: Record<string, [number, number]>;
  things: Thing[];
}

/** Town tiles are drawn 16x16 and shown at 2x (32px). One screen holds 15x10 tiles under the top bar;
 *  a larger map scrolls with the player (camera bounds keep the view inside the map). */
export const TILE = 16;
export const TOWN_ZOOM = 2;
export const TOWN_VIEW = { x: 0, y: 22, w: 480, h: 320 };
/** Map cells are placed from the world origin; the camera puts them on screen. */
export const TOWN_ORIGIN = { x: 0, y: 0 };
/** Building tiles, the same letters in every town: roof, eaves, wall, window, door, second wall. */
export const BUILDING: Record<string, string> = { R: 'roof', E: 'eave', '#': 'wall', w: 'window', D: 'door', v: 'wall2' };

export const TOWNS: Record<TownId, TownDef> = {
  lab: lab as unknown as TownDef,
  india: india as unknown as TownDef,
  australia: australia as unknown as TownDef,
  africa: africa as unknown as TownDef,
};
