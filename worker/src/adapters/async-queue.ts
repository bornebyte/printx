interface Waiter<T> {
  resolve: (value: T | null) => void;
  onAbort: () => void;
  signal: AbortSignal;
}

export class AsyncQueue<T> {
  private readonly items: T[] = [];
  private readonly waiters: Waiter<T>[] = [];
  private closed = false;

  push(item: T): void {
    if (this.closed) return;
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter.signal.removeEventListener("abort", waiter.onAbort);
      waiter.resolve(item);
      return;
    }
    this.items.push(item);
  }

  next(signal: AbortSignal): Promise<T | null> {
    if (this.items.length > 0) return Promise.resolve(this.items.shift() ?? null);
    if (this.closed || signal.aborted) return Promise.resolve(null);

    return new Promise((resolve) => {
      const waiter: Waiter<T> = {
        resolve,
        signal,
        onAbort: () => {
          const index = this.waiters.indexOf(waiter);
          if (index >= 0) this.waiters.splice(index, 1);
          resolve(null);
        },
      };
      signal.addEventListener("abort", waiter.onAbort, { once: true });
      this.waiters.push(waiter);
    });
  }

  close(): void {
    this.closed = true;
    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      if (!waiter) continue;
      waiter.signal.removeEventListener("abort", waiter.onAbort);
      waiter.resolve(null);
    }
  }
}
