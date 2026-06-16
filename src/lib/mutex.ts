/**
 * Minimal in-process async mutex. Serializes critical sections within a
 * single Node process (sufficient for single-instance deployments). For
 * multi-instance hosting, use a cross-process lock instead.
 */
export class Mutex {
  private tail: Promise<void> = Promise.resolve();

  async runExclusive<T>(task: () => Promise<T>): Promise<T> {
    // Chain onto the current tail so each caller waits for the previous one.
    const run = this.tail.then(task, task);
    // Keep the chain alive regardless of whether `task` resolves or rejects.
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
