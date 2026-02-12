/**
 * localStorage-based retry queue for failed score submissions.
 * Persists a single pending score and auto-expires after maxAge.
 */

interface PendingScore {
  score: number;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export class RetryQueue {
  private readonly storageKey: string;
  private readonly maxAgeMs: number;

  constructor(storageKey: string, maxAgeMs: number = DEFAULT_MAX_AGE_MS) {
    this.storageKey = storageKey;
    this.maxAgeMs = maxAgeMs;
  }

  /** Save a failed score for later retry. */
  save(score: number, metadata?: Record<string, unknown>): void {
    try {
      const pending: PendingScore = { score, metadata, timestamp: Date.now() };
      localStorage.setItem(this.storageKey, JSON.stringify(pending));
    } catch {
      // localStorage unavailable — silently fail
    }
  }

  /**
   * Get the pending score, or null if none exists or it has expired.
   * Automatically clears expired entries.
   */
  get(): { score: number; metadata?: Record<string, unknown> } | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;

      const pending: PendingScore = JSON.parse(raw);

      if (Date.now() - pending.timestamp > this.maxAgeMs) {
        this.clear();
        return null;
      }

      return { score: pending.score, metadata: pending.metadata };
    } catch {
      return null;
    }
  }

  /** Check if there's a pending score. */
  hasPending(): boolean {
    return this.get() !== null;
  }

  /** Clear the pending score. */
  clear(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // silently fail
    }
  }
}
