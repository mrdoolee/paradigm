// Which Natural Earth countries make up each puzzle piece.
// A polygon is kept only if its own centroid lies inside one of the boxes,
// which drops overseas territories (e.g. French Guiana from France).

export type Box = [lonMin: number, latMin: number, lonMax: number, latMax: number];

export interface Group {
  id: string;
  pick: (p: { CONTINENT: string; ADMIN: string }) => boolean;
  boxes: Box[];
  fixed?: boolean;
}

const INDIA = ['India', 'Pakistan', 'Bangladesh', 'Nepal', 'Bhutan', 'Sri Lanka'];

export const GROUPS: Group[] = [
  { id: 'africa', pick: (p) => p.CONTINENT === 'Africa', boxes: [[-20, -36, 52, 38]], fixed: true },
  { id: 'south-america', pick: (p) => p.CONTINENT === 'South America', boxes: [[-82, -56, -34, 13]] },
  { id: 'north-america', pick: (p) => p.CONTINENT === 'North America' && p.ADMIN !== 'Greenland', boxes: [[-170, 7, -52, 84]] },
  { id: 'greenland', pick: (p) => p.ADMIN === 'Greenland', boxes: [[-75, 59, -10, 84]] },
  { id: 'antarctica', pick: (p) => p.CONTINENT === 'Antarctica', boxes: [[-180, -90, 180, -60]] },
  { id: 'australia', pick: (p) => p.ADMIN === 'Australia', boxes: [[112, -44, 154, -10]] },
  { id: 'india', pick: (p) => INDIA.includes(p.ADMIN), boxes: [[60, 5, 98, 37]] },
  {
    id: 'eurasia',
    pick: (p) => (p.CONTINENT === 'Europe' || p.CONTINENT === 'Asia') && !INDIA.includes(p.ADMIN),
    boxes: [[-25, 0, 180, 85]],
  },
];
