/**
 * Generic TTL cache with in-flight deduplication and background refresh.
 *
 * Features:
 * - TTL-based expiration
 * - In-flight request deduplication
 * - Background refresh scheduling (handles concurrent refresh requests)
 */

export class Cache<T> {
  private data: T | undefined;
  private fetchedAt = 0;
  private inflight: Promise<T> | null = null;
  private pendingRefresh: (() => Promise<T>) | null = null;
  private readonly ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  /**
   * Get cached value if fresh, otherwise fetch via the provided function.
   * Deduplicates concurrent calls — only one fetch runs at a time.
   */
  async getOrFetch(fetchFn: () => Promise<T>): Promise<T> {
    if (this.isFresh()) {
      return this.data!;
    }

    if (this.inflight) {
      return this.inflight;
    }

    this.inflight = fetchFn().then((result) => {
      this.data = result;
      this.fetchedAt = Date.now();
      this.inflight = null;
      return result;
    }).catch((err) => {
      this.inflight = null;
      throw err;
    });

    return this.inflight;
  }

  /**
   * Trigger a background refresh without awaiting the result.
   * Returns immediately. If a fetch is already in flight, schedules
   * the refresh to run after the current one completes.
   */
  refreshInBackground(fetchFn: () => Promise<T>): void {
    if (this.inflight) {
      // Schedule refresh after current in-flight completes
      this.pendingRefresh = fetchFn;
      return;
    }

    this.startBackgroundFetch(fetchFn);
  }

  private startBackgroundFetch(fetchFn: () => Promise<T>): void {
    this.inflight = fetchFn().then((result) => {
      this.data = result;
      this.fetchedAt = Date.now();
      this.inflight = null;

      // If a refresh was scheduled while we were fetching, execute it now
      if (this.pendingRefresh) {
        const pending = this.pendingRefresh;
        this.pendingRefresh = null;
        this.startBackgroundFetch(pending);
      }

      return result;
    }).catch((err) => {
      this.inflight = null;
      this.pendingRefresh = null;
      throw err;
    });

    // Swallow the unhandled rejection — background refresh is best-effort
    this.inflight.catch(() => {});
  }

  /** Invalidate the cache, forcing the next getOrFetch to re-fetch. */
  invalidate(): void {
    this.fetchedAt = 0;
  }

  /** Get the cached value without fetching. Returns undefined if empty or stale. */
  get(): T | undefined {
    return this.isFresh() ? this.data : undefined;
  }

  /** Get the cached value even if stale. Returns undefined only if never fetched. */
  getStale(): T | undefined {
    return this.data;
  }

  /** Check if the cache has fresh (non-expired) data. */
  isFresh(): boolean {
    return this.data !== undefined && Date.now() - this.fetchedAt < this.ttlMs;
  }
}
