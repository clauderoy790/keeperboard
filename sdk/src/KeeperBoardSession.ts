/**
 * High-level KeeperBoard API for browser games.
 * Wraps KeeperBoardClient with automatic identity management, caching,
 * retry queue, and name validation.
 *
 * Recommended for most consumers. For server-side or advanced use,
 * use KeeperBoardClient directly.
 */

import { KeeperBoardClient } from './KeeperBoardClient';
import { PlayerIdentity } from './PlayerIdentity';
import { Cache } from './Cache';
import { RetryQueue } from './RetryQueue';
import { validateName } from './validation';
import type {
  SessionConfig,
  SessionScoreResult,
  SnapshotResult,
  SnapshotEntry,
  PlayerResult,
  NameValidationOptions,
} from './types';

export class KeeperBoardSession {
  private readonly client: KeeperBoardClient;
  private readonly identity: PlayerIdentity;
  private readonly leaderboard: string;
  private readonly defaultPlayerName: string;
  private readonly cache: Cache<SnapshotResult> | null;
  private readonly retryQueue: RetryQueue | null;
  private cachedLimit = 0; // Track the limit used for cached data
  private isSubmitting = false;

  constructor(config: SessionConfig) {
    this.client = new KeeperBoardClient({
      apiKey: config.apiKey,
      defaultLeaderboard: config.leaderboard,
      apiUrl: config.apiUrl,
    });

    this.identity = new PlayerIdentity(config.identity);
    this.leaderboard = config.leaderboard;
    this.defaultPlayerName = config.defaultPlayerName ?? 'ANON';

    // Cache layer (opt-in)
    this.cache = config.cache
      ? new Cache<SnapshotResult>(config.cache.ttlMs)
      : null;

    // Retry queue (opt-in)
    this.retryQueue = config.retry
      ? new RetryQueue(
          `keeperboard_retry_${config.leaderboard}`,
          config.retry.maxAgeMs
        )
      : null;
  }

  // ============================================
  // IDENTITY
  // ============================================

  /** Get or create a persistent player GUID. */
  getPlayerGuid(): string {
    return this.identity.getOrCreatePlayerGuid();
  }

  /** Get the stored player name, falling back to defaultPlayerName. */
  getPlayerName(): string {
    return this.identity.getPlayerName() ?? this.defaultPlayerName;
  }

  /** Store a player name locally. Does NOT update the server — call updatePlayerName() for that. */
  setPlayerName(name: string): void {
    this.identity.setPlayerName(name);
  }

  /** Validate a name using configurable rules. Returns sanitized string or null. */
  validateName(input: string, options?: NameValidationOptions): string | null {
    return validateName(input, options);
  }

  // ============================================
  // CORE API
  // ============================================

  /**
   * Submit a score. Identity and leaderboard are auto-injected.
   * Returns a discriminated union: `{ success: true, rank, isNewHighScore }` or `{ success: false, error }`.
   *
   * If retry is enabled, failed submissions are saved to localStorage for later retry.
   * Prevents concurrent double-submissions.
   */
  async submitScore(
    score: number,
    metadata?: Record<string, unknown>
  ): Promise<SessionScoreResult> {
    if (this.isSubmitting) {
      return { success: false, error: 'Submission in progress' };
    }

    this.isSubmitting = true;

    try {
      const result = await this.client.submitScore({
        playerGuid: this.getPlayerGuid(),
        playerName: this.getPlayerName(),
        score,
        metadata,
      });

      // Clear any pending retry on success
      this.retryQueue?.clear();

      // Invalidate cache + background refresh
      if (this.cache) {
        this.cache.invalidate();
        this.cachedLimit = 0;
        this.cache.refreshInBackground(() => this.fetchSnapshot());
      }

      return {
        success: true,
        rank: result.rank,
        isNewHighScore: result.isNewHighScore,
      };
    } catch (error) {
      // Save to retry queue if enabled
      this.retryQueue?.save(score, metadata);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.isSubmitting = false;
    }
  }

  /**
   * Get a combined snapshot: leaderboard entries (with `isCurrentPlayer` flag)
   * plus the current player's rank if they're outside the top N.
   *
   * Uses cache if enabled and fresh. If a larger limit is requested than
   * what's cached, the cache is invalidated and fresh data is fetched.
   */
  async getSnapshot(options?: { limit?: number }): Promise<SnapshotResult> {
    const limit = options?.limit ?? 10;

    if (this.cache) {
      // Invalidate cache if requesting more entries than cached
      if (limit > this.cachedLimit) {
        this.cache.invalidate();
      }

      const result = await this.cache.getOrFetch(() => this.fetchSnapshot(limit));
      this.cachedLimit = limit;
      return result;
    }

    return this.fetchSnapshot(limit);
  }

  /**
   * Update the player's name on the server and locally.
   * Returns true on success, false on failure.
   */
  async updatePlayerName(newName: string): Promise<boolean> {
    try {
      await this.client.updatePlayerName({
        playerGuid: this.getPlayerGuid(),
        newName,
      });
      this.identity.setPlayerName(newName);

      // Invalidate cache since names changed
      if (this.cache) {
        this.cache.invalidate();
        this.cachedLimit = 0;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retry submitting a pending score (from a previous failed submission).
   * Call this on app startup.
   */
  async retryPendingScore(): Promise<SessionScoreResult | null> {
    const pending = this.retryQueue?.get();
    if (!pending) return null;

    const result = await this.submitScore(pending.score, pending.metadata);
    if (result.success) {
      this.retryQueue?.clear();
    }
    return result;
  }

  /** Check if there's a pending score in the retry queue. */
  hasPendingScore(): boolean {
    return this.retryQueue?.hasPending() ?? false;
  }

  /**
   * Pre-fetch snapshot data in the background for instant display later.
   * No-op if cache is disabled or already fresh.
   */
  prefetch(): void {
    if (!this.cache) return;
    if (this.cache.isFresh()) return;
    this.cache.refreshInBackground(() => this.fetchSnapshot());
  }

  /** Escape hatch: access the underlying KeeperBoardClient. */
  getClient(): KeeperBoardClient {
    return this.client;
  }

  // ============================================
  // INTERNAL
  // ============================================

  private async fetchSnapshot(limit: number = 10): Promise<SnapshotResult> {
    const playerGuid = this.getPlayerGuid();

    const [leaderboard, playerRank] = await Promise.all([
      this.client.getLeaderboard({ limit }),
      this.client.getPlayerRank({ playerGuid }),
    ]);

    const entries: SnapshotEntry[] = leaderboard.entries.map((e) => ({
      rank: e.rank,
      playerGuid: e.playerGuid,
      playerName: e.playerName,
      score: e.score,
      isCurrentPlayer: e.playerGuid === playerGuid,
    }));

    // Include playerRank only if the player is outside the returned entries
    const playerInEntries = entries.some((e) => e.isCurrentPlayer);
    const effectivePlayerRank: PlayerResult | null =
      playerRank && !playerInEntries ? playerRank : null;

    return {
      entries,
      totalCount: leaderboard.totalCount,
      playerRank: effectivePlayerRank,
    };
  }
}
