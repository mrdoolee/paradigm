import table from './galmuri11-widths.json';

export type Measure = (s: string) => number;
export interface WidthTable {
  sizePx: number;
  ranges: [number, number, number][];
}

function widthOf(t: WidthTable, cp: number): number | null {
  let lo = 0;
  let hi = t.ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [a, b, w] = t.ranges[mid];
    if (cp < a) hi = mid - 1;
    else if (cp > b) lo = mid + 1;
    else return w;
  }
  return null;
}

/** Sums glyph advances; characters missing from the font count as one full-width cell. */
export function makeTableMeasure(t: WidthTable): Measure {
  return (s) => {
    let sum = 0;
    for (const ch of s) sum += widthOf(t, ch.codePointAt(0)!) ?? t.sizePx;
    return sum;
  };
}

/** Characters of s that the font has no glyph for, first occurrence order. */
export function missingChars(t: WidthTable, s: string): string[] {
  const out: string[] = [];
  for (const ch of s) {
    if (ch === '\n' || ch === '\r') continue;
    if (widthOf(t, ch.codePointAt(0)!) === null && !out.includes(ch)) out.push(ch);
  }
  return out;
}

export const galmuriTable = table as unknown as WidthTable;
export const galmuriMeasure: Measure = makeTableMeasure(galmuriTable);
