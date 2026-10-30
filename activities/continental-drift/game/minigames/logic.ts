// Rules of the field mini-games, kept apart from Phaser so they can be unit tested.
// None of them can be failed: they only say how much is left.

export interface CellRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Fossil dig: a grid of dirt cells; a fossil counts as found once every cell over it is dug. */
export class DigBoard {
  private dug: Uint8Array;

  constructor(
    readonly cols: number,
    readonly rows: number,
    readonly fossils: CellRect[],
  ) {
    this.dug = new Uint8Array(cols * rows);
  }

  private inside(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  dig(x: number, y: number): boolean {
    if (!this.inside(x, y) || this.dug[y * this.cols + x]) return false;
    this.dug[y * this.cols + x] = 1;
    return true;
  }

  isDug(x: number, y: number): boolean {
    return this.inside(x, y) && this.dug[y * this.cols + x] === 1;
  }

  private fossilFound(f: CellRect) {
    for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) if (!this.isDug(x, y)) return false;
    return true;
  }

  found(): number {
    return this.fossils.filter((f) => this.fossilFound(f)).length;
  }

  done(): boolean {
    return this.found() === this.fossils.length;
  }

  /** Cells still covering a fossil, in reading order. */
  remaining(): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    for (const f of this.fossils)
      for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) if (!this.isDug(x, y)) out.push({ x, y });
    return out;
  }
}

export const SCRATCH_DONE = 0.7;

/** Glacier scratches: dirt over a rock face, rubbed away in small discs. */
export class ScratchField {
  private cleared: Uint8Array;
  private count = 0;

  constructor(
    readonly cols: number,
    readonly rows: number,
  ) {
    this.cleared = new Uint8Array(cols * rows);
  }

  /** Clears every cell within distance r (in cells) of (cx, cy). Returns how many were new. */
  rub(cx: number, cy: number, r: number): number {
    let n = 0;
    const x0 = Math.floor(cx - r);
    const y0 = Math.floor(cy - r);
    for (let y = y0; y <= Math.ceil(cy + r); y++)
      for (let x = x0; x <= Math.ceil(cx + r); x++) {
        if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) continue;
        if ((x - cx) ** 2 + (y - cy) ** 2 > r * r + 1e-9) continue;
        const k = y * this.cols + x;
        if (this.cleared[k]) continue;
        this.cleared[k] = 1;
        n++;
      }
    this.count += n;
    return n;
  }

  isCleared(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows && this.cleared[y * this.cols + x] === 1;
  }

  ratio(): number {
    return this.count / (this.cols * this.rows);
  }
}

/**
 * Magnetic polarity at distance dx from the ridge axis. stripes[0] is the ridge band
 * (normal, like today); bands then alternate outward, the same on both sides.
 */
export function stripeAt(dx: number, stripes: number[]): 'normal' | 'reversed' {
  let d = Math.abs(dx);
  for (let i = 0; i < stripes.length; i++) {
    if (d < stripes[i]) return i % 2 === 0 ? 'normal' : 'reversed';
    d -= stripes[i];
  }
  return stripes.length % 2 === 0 ? 'normal' : 'reversed';
}

export const SURVEY_DONE = 0.95;

/** Which parts of [x0, x1] the survey ship has crossed. */
export class SurveyTrack {
  private spans: [number, number][] = [];

  constructor(
    readonly x0: number,
    readonly x1: number,
  ) {}

  mark(a: number, b: number): void {
    let lo = Math.max(this.x0, Math.min(a, b));
    let hi = Math.min(this.x1, Math.max(a, b));
    if (hi <= lo) return;
    const keep: [number, number][] = [];
    for (const [s, e] of this.spans) {
      if (e < lo || s > hi) keep.push([s, e]);
      else {
        lo = Math.min(lo, s);
        hi = Math.max(hi, e);
      }
    }
    keep.push([lo, hi]);
    this.spans = keep.sort((p, q) => p[0] - q[0]);
  }

  coverage(): number {
    const total = this.spans.reduce((a, [s, e]) => a + (e - s), 0);
    return total / (this.x1 - this.x0);
  }

  /** The middle of the first gap, for tests and hints; null when fully covered. */
  firstGap(): number | null {
    let x = this.x0;
    for (const [s, e] of this.spans) {
      if (s > x + 0.5) return (x + s) / 2;
      x = Math.max(x, e);
    }
    return x < this.x1 - 0.5 ? (x + this.x1) / 2 : null;
  }
}
