/**
 * Counts how long a player has been working on a drag phase. The target outline (the hint)
 * shows once that time passes the delay. Dialog time does not count.
 */
export class HintClock {
  private elapsed = 0;

  constructor(private readonly delayMs: number) {}

  tick(dtMs: number, counting: boolean): void {
    if (counting) this.elapsed += dtMs;
  }

  /** A new phase, or a piece just fitted: start counting again. */
  reset(): void {
    this.elapsed = 0;
  }

  get shown(): boolean {
    return this.elapsed >= this.delayMs;
  }
}
