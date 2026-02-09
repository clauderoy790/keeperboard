/**
 * Type definitions for KeeperBoard SDK.
 * Matches the API response shapes from the KeeperBoard public API.
 */
interface KeeperBoardConfig {
    /** API key from the KeeperBoard dashboard (e.g., "kb_dev_abc123...") */
    apiKey: string;
    /** @internal Base URL override for testing. Do not use in production. */
    apiUrl?: string;
}
interface ScoreSubmission {
    /** Unique player identifier (UUID or custom string) */
    player_guid: string;
    /** Player display name */
    player_name: string;
    /** Score value */
    score: number;
    /** Optional metadata to attach to the score */
    metadata?: Record<string, unknown>;
}
/** Reset schedule options for leaderboards */
type ResetSchedule = 'none' | 'daily' | 'weekly' | 'monthly';
interface ScoreResponse {
    /** Score ID in the database */
    id: string;
    /** Player's unique identifier */
    player_guid: string;
    /** Player's display name */
    player_name: string;
    /** Current score value */
    score: number;
    /** Player's rank on the leaderboard */
    rank: number;
    /** Whether this submission resulted in a new high score */
    is_new_high_score: boolean;
}
interface LeaderboardEntry {
    /** Position on the leaderboard (1-indexed) */
    rank: number;
    /** Player's unique identifier */
    player_guid: string;
    /** Player's display name */
    player_name: string;
    /** Score value */
    score: number;
}
interface LeaderboardResponse {
    /** Array of leaderboard entries */
    entries: LeaderboardEntry[];
    /** Total number of scores in this version/period */
    total_count: number;
    /** The reset schedule of this leaderboard */
    reset_schedule: ResetSchedule;
    /** Current version number — only present when reset_schedule is not 'none' */
    version?: number;
    /** Oldest available version number — only present when reset_schedule is not 'none' */
    oldest_version?: number;
    /** ISO timestamp of when the next reset occurs — only present when reset_schedule is not 'none' */
    next_reset?: string;
}
interface PlayerResponse {
    /** Score ID in the database */
    id: string;
    /** Player's unique identifier */
    player_guid: string;
    /** Player's display name */
    player_name: string;
    /** Player's score */
    score: number;
    /** Player's rank on the leaderboard */
    rank: number;
}
interface ClaimResponse {
    /** Whether the score was successfully claimed */
    claimed: boolean;
    /** The claimed score value */
    score: number;
    /** Player's rank after claiming */
    rank: number;
    /** The player name that was matched */
    player_name: string;
}
interface HealthResponse {
    /** Service name */
    service: string;
    /** API version */
    version: string;
    /** Server timestamp */
    timestamp: string;
}
declare class KeeperBoardError extends Error {
    readonly code: string;
    readonly statusCode: number;
    constructor(message: string, code: string, statusCode: number);
}

/**
 * KeeperBoard API client for TypeScript/JavaScript games.
 * Works in any browser environment using the fetch API.
 */

declare class KeeperBoardClient {
    private static readonly DEFAULT_API_URL;
    private readonly apiUrl;
    private readonly apiKey;
    constructor(config: KeeperBoardConfig);
    /**
     * Submit a score to the default leaderboard.
     * Only updates if the new score is higher than the existing one.
     */
    submitScore(playerGuid: string, playerName: string, score: number): Promise<ScoreResponse>;
    /**
     * Submit a score to a specific leaderboard.
     * Only updates if the new score is higher than the existing one.
     */
    submitScore(playerGuid: string, playerName: string, score: number, leaderboard: string): Promise<ScoreResponse>;
    /**
     * Submit a score with metadata.
     * Only updates if the new score is higher than the existing one.
     */
    submitScore(playerGuid: string, playerName: string, score: number, leaderboard: string, metadata: Record<string, unknown>): Promise<ScoreResponse>;
    /**
     * Get the default leaderboard (top 10 entries).
     *
     * @example
     * const lb = await client.getLeaderboard();
     */
    getLeaderboard(): Promise<LeaderboardResponse>;
    /**
     * Get a specific leaderboard by name (top 10 entries).
     *
     * @example
     * const lb = await client.getLeaderboard('Weekly Best');
     */
    getLeaderboard(name: string): Promise<LeaderboardResponse>;
    /**
     * Get a leaderboard with custom limit.
     *
     * @example
     * const lb = await client.getLeaderboard('Weekly Best', 25);
     */
    getLeaderboard(name: string, limit: number): Promise<LeaderboardResponse>;
    /**
     * Get a leaderboard with pagination.
     *
     * @example
     * const page2 = await client.getLeaderboard('Weekly Best', 10, 10);
     */
    getLeaderboard(name: string, limit: number, offset: number): Promise<LeaderboardResponse>;
    /**
     * Get a specific version of a time-based leaderboard.
     *
     * @example
     * // Get last week's leaderboard (version 3)
     * const lastWeek = await client.getLeaderboardVersion('Weekly Best', 3);
     */
    getLeaderboardVersion(name: string, version: number): Promise<LeaderboardResponse>;
    /**
     * Get a specific version with custom limit.
     */
    getLeaderboardVersion(name: string, version: number, limit: number): Promise<LeaderboardResponse>;
    /**
     * Get a specific version with pagination.
     */
    getLeaderboardVersion(name: string, version: number, limit: number, offset: number): Promise<LeaderboardResponse>;
    /**
     * Get a player's rank and score on the default leaderboard.
     * Returns null if the player has no score.
     *
     * @example
     * const player = await client.getPlayerRank(playerGuid);
     * if (player) {
     *   console.log(`You are ranked #${player.rank}`);
     * }
     */
    getPlayerRank(playerGuid: string): Promise<PlayerResponse | null>;
    /**
     * Get a player's rank and score on a specific leaderboard.
     * Returns null if the player has no score.
     */
    getPlayerRank(playerGuid: string, leaderboard: string): Promise<PlayerResponse | null>;
    /**
     * Update a player's display name on the default leaderboard.
     */
    updatePlayerName(playerGuid: string, newName: string): Promise<PlayerResponse>;
    /**
     * Update a player's display name on a specific leaderboard.
     */
    updatePlayerName(playerGuid: string, newName: string, leaderboard: string): Promise<PlayerResponse>;
    /**
     * Claim a migrated score by matching player name.
     * Used when scores were imported without player GUIDs.
     */
    claimScore(playerGuid: string, playerName: string): Promise<ClaimResponse>;
    /**
     * Claim a migrated score on a specific leaderboard.
     */
    claimScore(playerGuid: string, playerName: string, leaderboard: string): Promise<ClaimResponse>;
    /**
     * Check if the API is healthy.
     * This endpoint does not require an API key.
     */
    healthCheck(): Promise<HealthResponse>;
    private request;
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

export { type ClaimResponse, type HealthResponse, KeeperBoardClient, type KeeperBoardConfig, KeeperBoardError, type LeaderboardEntry, type LeaderboardResponse, PlayerIdentity, type PlayerIdentityConfig, type PlayerResponse, type ResetSchedule, type ScoreResponse, type ScoreSubmission };
