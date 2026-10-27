/** Runs dialog jobs one at a time, in call order. */
export class DialogQueue {
  private tail: Promise<unknown> = Promise.resolve();
  private running = 0;

  get busy(): boolean {
    return this.running > 0;
  }

  enqueue<T>(job: () => Promise<T>): Promise<T> {
    this.running++;
    const run = this.tail.then(job).finally(() => {
      this.running--;
    });
    this.tail = run.catch(() => undefined);
    return run;
  }
}

/** Walks the pages of a dialog block; at most one step per frame so fast double presses skip nothing. */
export class PageCursor {
  private s = 0;
  private p = 0;
  private lastFrame = -1;
  private finished = false;

  constructor(private pages: string[][][]) {}

  advance(frame: number): 'next' | 'done' | 'ignored' {
    if (this.finished || frame === this.lastFrame) return 'ignored';
    this.lastFrame = frame;
    if (this.p + 1 < this.pages[this.s].length) {
      this.p++;
      return 'next';
    }
    if (this.s + 1 < this.pages.length) {
      this.s++;
      this.p = 0;
      return 'next';
    }
    this.finished = true;
    return 'done';
  }

  current(): { speechIndex: number; page: string[]; pageNo: number; pageCount: number } {
    return { speechIndex: this.s, page: this.pages[this.s][this.p], pageNo: this.p + 1, pageCount: this.pages[this.s].length };
  }
}
