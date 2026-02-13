/**
 * Type definitions for KeeperBoard SDK.
 *
 * Public types use camelCase. Internal types (prefixed with Api*) match the
 * snake_case shapes returned by the KeeperBoard REST API and are used only
 * for deserialization inside the client.
 */
interface KeeperBoardConfig {
    /** API key from the KeeperBoard dashboard (e.g., "kb_dev_abc123...") */
    apiKey: string;
    /** Default leaderboard name — used when no leaderboard is specified in method calls */
    defaultLeaderboard?: string;
    /** @internal Base URL override for testing. Do not use in production. */
    apiUrl?: string;
}
interface SubmitScoreOptions {
    playerGuid: string;
    playerName: string;
    score: number;
    /** Leaderboard name. Falls back to `defaultLeaderboard` from config. */
    leaderboard?: string;
    metadata?: Record<string, unknown>;
}
interface GetLeaderboardOptions {
    /** Leaderboard name. Falls back to `defaultLeaderboard` from config. */
    leaderboard?: string;
    /** Max entries to return (1–100, default 10). */
    limit?: number;
    /** Offset for pagination (default 0). */
    offset?: number;
    /** Fetch a specific version of a time-based leaderboard. */
    version?: number;
}
interface GetPlayerRankOptions {
    playerGuid: string;
    /** Leaderboard name. Falls back to `defaultLeaderboard` from config. */
    leaderboard?: string;
}
interface UpdatePlayerNameOptions {
    playerGuid: string;
    newName: string;
    /** Leaderboard name. Falls back to `defaultLeaderboard` from config. */
    leaderboard?: string;
}
interface ClaimScoreOptions {
    playerGuid: string;
    playerName: string;
    /** Leaderboard name. Falls back to `defaultLeaderboard` from config. */
    leaderboard?: string;
}
interface ScoreResult {
    id: string;
    playerGuid: string;
    playerName: string;
    score: number;
    rank: number;
    isNewHighScore: boolean;
}
interface LeaderboardEntry {
    rank: number;
    playerGuid: string;
    playerName: string;
    score: number;
}
/** Reset schedule options for leaderboards */
type ResetSchedule = 'none' | 'daily' | 'weekly' | 'monthly';
interface LeaderboardResult {
    entries: LeaderboardEntry[];
    totalCount: number;
    resetSchedule: ResetSchedule;
    /** Current version number — only present when resetSchedule is not 'none'. */
    version?: number;
    /** Oldest available version number — only present when resetSchedule is not 'none'. */
    oldestVersion?: number;
    /** ISO timestamp of when the next reset occurs — only present when resetSchedule is not 'none'. */
    nextReset?: string;
}
interface PlayerResult {
    id: string;
    playerGuid: string;
    playerName: string;
    score: number;
    rank: number;
}
interface ClaimResult {
    claimed: boolean;
    score: number;
    rank: number;
    playerName: string;
}
interface HealthResult {
    service: string;
    version: string;
    timestamp: string;
}
interface SessionConfig {
    /** API key from the KeeperBoard dashboard */
    apiKey: string;
    /** Leaderboard name (required — the session is bound to one board) */
    leaderboard: string;
    /** PlayerIdentity config for localStorage key prefix */
    identity?: {
        keyPrefix?: string;
    };
    /** TTL cache configuration for getSnapshot() */
    cache?: {
        ttlMs: number;
    };
    /** Retry queue configuration for failed score submissions */
    retry?: {
        maxAgeMs?: number;
    };
    /** @internal Base URL override for testing. */
    apiUrl?: string;
}
type SessionScoreResult = {
    success: true;
    rank: number;
    isNewHighScore: boolean;
} | {
    success: false;
    error: string;
};
interface SnapshotEntry {
    rank: number;
    playerGuid: string;
    playerName: string;
    score: number;
    isCurrentPlayer: boolean;
}
interface SnapshotResult {
    entries: SnapshotEntry[];
    totalCount: number;
    /** Player's own rank info — included only when the player is outside the top N. */
    playerRank: PlayerResult | null;
}
interface NameValidationOptions {
    /** Minimum length after sanitization (default 2). */
    minLength?: number;
    /** Maximum length — input is truncated to this (default 12). */
    maxLength?: number;
    /** Convert to uppercase (default true). */
    uppercase?: boolean;
    /** Regex of allowed characters applied after case conversion (default /[^A-Z0-9_]/g removes non-matching). */
    allowedPattern?: RegExp;
}
/** @internal */
interface ScoreSubmission {
    player_guid: string;
    player_name: string;
    score: number;
    metadata?: Record<string, unknown>;
}
/** @internal */
interface ApiScoreResponse {
    id: string;
    player_guid: string;
    player_name: string;
    score: number;
    rank: number;
    is_new_high_score: boolean;
}
/** @internal */
interface ApiLeaderboardEntry {
    rank: number;
    player_guid: string;
    player_name: string;
    score: number;
}
/** @internal */
interface ApiLeaderboardResponse {
    entries: ApiLeaderboardEntry[];
    total_count: number;
    reset_schedule: ResetSchedule;
    version?: number;
    oldest_version?: number;
    next_reset?: string;
}
/** @internal */
interface ApiPlayerResponse {
    id: string;
    player_guid: string;
    player_name: string;
    score: number;
    rank: number;
}
/** @internal */
interface ApiClaimResponse {
    claimed: boolean;
    score: number;
    rank: number;
    player_name: string;
}
/** @internal */
interface ApiHealthResponse {
    service: string;
    version: string;
    timestamp: string;
}
declare class KeeperBoardError extends Error {
    readonly code: string;
    readonly statusCode: number;
    constructor(message: string, code: string, statusCode: number);
}
/** @deprecated Use `ApiScoreResponse` (internal) or `ScoreResult` (public). */
type ScoreResponse = ApiScoreResponse;
/** @deprecated Use `ApiLeaderboardResponse` (internal) or `LeaderboardResult` (public). */
type LeaderboardResponse = ApiLeaderboardResponse;
/** @deprecated Use `ApiPlayerResponse` (internal) or `PlayerResult` (public). */
type PlayerResponse = ApiPlayerResponse;
/** @deprecated Use `ApiClaimResponse` (internal) or `ClaimResult` (public). */
type ClaimResponse = ApiClaimResponse;
/** @deprecated Use `ApiHealthResponse` (internal) or `HealthResult` (public). */
type HealthResponse = ApiHealthResponse;

/**
 * KeeperBoard API client for TypeScript/JavaScript games.
 * Works in any browser environment using the fetch API.
 *
 * All public methods accept options objects and return camelCase results.
 * A `defaultLeaderboard` can be set in the config to avoid passing it every call.
 */

declare class KeeperBoardClient {
    private static readonly DEFAULT_API_URL;
    private readonly apiUrl;
    private readonly apiKey;
    private readonly defaultLeaderboard?;
    constructor(config: KeeperBoardConfig);
    /**
     * Submit a score. Only updates if the new score is higher than the existing one.
     *
     * @example
     * const result = await client.submitScore({
     *   playerGuid: 'abc-123',
     *   playerName: 'ACE',
     *   score: 1500,
     * });
     * console.log(result.rank, result.isNewHighScore);
     */
    submitScore(options: SubmitScoreOptions): Promise<ScoreResult>;
    /**
     * Get a leaderboard. Supports pagination and version-based lookups for
     * time-based boards.
     *
     * @example
     * // Top 10 on default board
     * const lb = await client.getLeaderboard();
     *
     * // Top 25 on a specific board
     * const lb = await client.getLeaderboard({ leaderboard: 'Weekly', limit: 25 });
     *
     * // Historical version
     * const lb = await client.getLeaderboard({ leaderboard: 'Weekly', version: 3 });
     */
    getLeaderboard(options?: GetLeaderboardOptions): Promise<LeaderboardResult>;
    /**
     * Get a player's rank and score. Returns `null` if the player has no score.
     *
     * @example
     * const player = await client.getPlayerRank({ playerGuid: 'abc-123' });
     * if (player) console.log(`Rank #${player.rank}`);
     */
    getPlayerRank(options: GetPlayerRankOptions): Promise<PlayerResult | null>;
    /**
     * Update a player's display name.
     *
     * @example
     * const player = await client.updatePlayerName({
     *   playerGuid: 'abc-123',
     *   newName: 'MAVERICK',
     * });
     */
    updatePlayerName(options: UpdatePlayerNameOptions): Promise<PlayerResult>;
    /**
     * Claim a migrated score by matching player name.
     * Used when scores were imported without player GUIDs.
     */
    claimScore(options: ClaimScoreOptions): Promise<ClaimResult>;
    /**
     * Check if the API is healthy. Does not require an API key.
     */
    healthCheck(): Promise<HealthResult>;
    private mapScoreResponse;
    private mapLeaderboardResponse;
    private mapPlayerResponse;
    private mapClaimResponse;
    private request;
}

/**
 * High-level KeeperBoard API for browser games.
 * Wraps KeeperBoardClient with automatic identity management, caching,
 * retry queue, and name validation.
 *
 * Recommended for most consumers. For server-side or advanced use,
 * use KeeperBoardClient directly.
 */

declare class KeeperBoardSession {
    private readonly client;
    private readonly identity;
    private readonly leaderboard;
    private readonly cache;
    private readonly retryQueue;
    private cachedLimit;
    private isSubmitting;
    constructor(config: SessionConfig);
    /** Get or create a persistent player GUID. */
    getPlayerGuid(): string;
    /** Get the stored player name, auto-generating one if none exists. */
    getPlayerName(): string;
    /** Store a player name locally. Does NOT update the server — call updatePlayerName() for that. */
    setPlayerName(name: string): void;
    /** Check if the player has explicitly set a name (vs auto-generated). */
    hasExplicitPlayerName(): boolean;
    /** Validate a name using configurable rules. Returns sanitized string or null. */
    validateName(input: string, options?: NameValidationOptions): string | null;
    /**
     * Submit a score. Identity and leaderboard are auto-injected.
     * Returns a discriminated union: `{ success: true, rank, isNewHighScore }` or `{ success: false, error }`.
     *
     * If retry is enabled, failed submissions are saved to localStorage for later retry.
     * Prevents concurrent double-submissions.
     */
    submitScore(score: number, metadata?: Record<string, unknown>): Promise<SessionScoreResult>;
    /**
     * Get a combined snapshot: leaderboard entries (with `isCurrentPlayer` flag)
     * plus the current player's rank if they're outside the top N.
     *
     * Uses cache if enabled and fresh. If a larger limit is requested than
     * what's cached, the cache is invalidated and fresh data is fetched.
     */
    getSnapshot(options?: {
        limit?: number;
    }): Promise<SnapshotResult>;
    /**
     * Update the player's name on the server and locally.
     * Returns true on success, false on failure.
     */
    updatePlayerName(newName: string): Promise<boolean>;
    /**
     * Retry submitting a pending score (from a previous failed submission).
     * Call this on app startup.
     */
    retryPendingScore(): Promise<SessionScoreResult | null>;
    /** Check if there's a pending score in the retry queue. */
    hasPendingScore(): boolean;
    /**
     * Pre-fetch snapshot data in the background for instant display later.
     * No-op if cache is disabled or already fresh.
     */
    prefetch(): void;
    /** Escape hatch: access the underlying KeeperBoardClient. */
    getClient(): KeeperBoardClient;
    private fetchSnapshot;
}

/**
 * Helper class for managing player identity in localStorage.
 * Provides persistent player GUID and name storage across game sessions.
 */
interface PlayerIdentityConfig {
    /** Prefix for localStorage keys (default: "keeperboard_") */
    keyPrefix?: string;
}
declare class PlayerIdentity {
    private readonly keyPrefix;
    private readonly guidKey;
    private readonly nameKey;
    private readonly nameAutoKey;
    constructor(config?: PlayerIdentityConfig);
    /**
     * Get the stored player GUID, or null if none exists.
     */
    getPlayerGuid(): string | null;
    /**
     * Set the player GUID in localStorage.
     */
    setPlayerGuid(guid: string): void;
    /**
     * Get the stored player GUID, creating one if it doesn't exist.
     * Uses crypto.randomUUID() for generating new GUIDs.
     */
    getOrCreatePlayerGuid(): string;
    /**
     * Get the stored player name, or null if none exists.
     */
    getPlayerName(): string | null;
    /**
     * Set the player name in localStorage.
     */
    setPlayerName(name: string): void;
    /**
     * Get the stored player name, creating an auto-generated one if it doesn't exist.
     * Uses AdjectiveNounNumber pattern (e.g., ArcaneBlob99).
     */
    getOrCreatePlayerName(): string;
    /**
     * Check if the current player name was auto-generated (vs explicitly set by user).
     */
    isAutoGeneratedName(): boolean;
    /**
     * Clear all stored player identity data.
     */
    clear(): void;
    /**
     * Check if player identity is stored.
     */
    hasIdentity(): boolean;
    /**
     * Generate a UUID v4.
     * Uses crypto.randomUUID() if available, otherwise falls back to a manual implementation.
     */
    private generateUUID;
}

/**
 * Pure-function name validation with configurable rules.
 * Returns the sanitized name or null if invalid after sanitization.
 */

/**
 * Validate and sanitize a player name.
 *
 * 1. Trims whitespace
 * 2. Optionally converts to uppercase (default: yes)
 * 3. Strips characters not matching `allowedPattern`
 * 4. Truncates to `maxLength`
 * 5. Returns `null` if result is shorter than `minLength`
 *
 * @example
 * validateName('  Ace Pilot! ')  // 'ACE_PILOT' → wait, no spaces allowed → 'ACEPILOT'
 * validateName('ab')             // 'AB'
 * validateName('x')              // null (too short)
 */
declare function validateName(input: string, options?: NameValidationOptions): string | null;

/**
 * Auto-generated player name system.
 * Generates random AdjectiveNounNumber names (e.g., ArcaneBlob99).
 * Names are PascalCase words plus a numeric suffix, and fit within 4-12 characters.
 */
/**
 * Generate a random player name in the format AdjectiveNoun1-99.
 * Returns a PascalCase string with length 4-12 characters (fits validateName rules).
 * ~990,000 unique combinations possible.
 *
 * @example
 * generatePlayerName() // 'ArcaneBlob99'
 * generatePlayerName() // 'CosmicViper42'
 */
declare function generatePlayerName(): string;

/**
 * Generic TTL cache with in-flight deduplication and background refresh.
 *
 * Features:
 * - TTL-based expiration
 * - In-flight request deduplication
 * - Background refresh scheduling (handles concurrent refresh requests)
 */
declare class Cache<T> {
    private data;
    private fetchedAt;
    private inflight;
    private pendingRefresh;
    private readonly ttlMs;
    constructor(ttlMs: number);
    /**
     * Get cached value if fresh, otherwise fetch via the provided function.
     * Deduplicates concurrent calls — only one fetch runs at a time.
     */
    getOrFetch(fetchFn: () => Promise<T>): Promise<T>;
    /**
     * Trigger a background refresh without awaiting the result.
     * Returns immediately. If a fetch is already in flight, schedules
     * the refresh to run after the current one completes.
     */
    refreshInBackground(fetchFn: () => Promise<T>): void;
    private startBackgroundFetch;
    /** Invalidate the cache, forcing the next getOrFetch to re-fetch. */
    invalidate(): void;
    /** Get the cached value without fetching. Returns undefined if empty or stale. */
    get(): T | undefined;
    /** Get the cached value even if stale. Returns undefined only if never fetched. */
    getStale(): T | undefined;
    /** Check if the cache has fresh (non-expired) data. */
    isFresh(): boolean;
}

/**
 * localStorage-based retry queue for failed score submissions.
 * Persists a single pending score and auto-expires after maxAge.
 */
declare class RetryQueue {
    private readonly storageKey;
    private readonly maxAgeMs;
    constructor(storageKey: string, maxAgeMs?: number);
    /** Save a failed score for later retry. */
    save(score: number, metadata?: Record<string, unknown>): void;
    /**
     * Get the pending score, or null if none exists or it has expired.
     * Automatically clears expired entries.
     */
    get(): {
        score: number;
        metadata?: Record<string, unknown>;
    } | null;
    /** Check if there's a pending score. */
    hasPending(): boolean;
    /** Clear the pending score. */
    clear(): void;
}

export { Cache, type ClaimResponse, type ClaimResult, type ClaimScoreOptions, type GetLeaderboardOptions, type GetPlayerRankOptions, type HealthResponse, type HealthResult, KeeperBoardClient, type KeeperBoardConfig, KeeperBoardError, KeeperBoardSession, type LeaderboardEntry, type LeaderboardResponse, type LeaderboardResult, type NameValidationOptions, PlayerIdentity, type PlayerIdentityConfig, type PlayerResponse, type PlayerResult, type ResetSchedule, RetryQueue, type ScoreResponse, type ScoreResult, type ScoreSubmission, type SessionConfig, type SessionScoreResult, type SnapshotEntry, type SnapshotResult, type SubmitScoreOptions, type UpdatePlayerNameOptions, generatePlayerName, validateName };
