/**
 * Type definitions for KeeperBoard SDK.
 * Matches the API response shapes from the KeeperBoard public API.
 */
interface KeeperBoardConfig {
    /** Base URL of the KeeperBoard API (e.g., "https://your-app.vercel.app") */
    apiUrl: string;
    /** API key from the KeeperBoard dashboard (e.g., "kb_dev_abc123...") */
    apiKey: string;
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
interface PlayerNameUpdate {
    /** New display name for the player */
    player_name: string;
}
interface ClaimRequest {
    /** Player GUID to assign to the migrated score */
    player_guid: string;
    /** Player name to match against migrated scores */
    player_name: string;
}
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
    /** Total number of scores on this leaderboard */
    total_count: number;
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
interface ApiSuccessResponse<T> {
    success: true;
    data: T;
}
interface ApiErrorResponse {
    success: false;
    error: string;
    code: string;
}
type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
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
    private readonly apiUrl;
    private readonly apiKey;
    constructor(config: KeeperBoardConfig);
    /**
     * Submit a score to the leaderboard.
     * Only updates if the new score is higher than the existing one.
     *
     * @param playerGuid - Unique player identifier
     * @param playerName - Player display name
     * @param score - Score value
     * @param metadata - Optional metadata to attach
     * @param leaderboardSlug - Optional leaderboard slug (uses default if not specified)
     * @returns Score response with rank and whether it's a new high score
     */
    submitScore(playerGuid: string, playerName: string, score: number, metadata?: Record<string, unknown>, leaderboardSlug?: string): Promise<ScoreResponse>;
    /**
     * Get the leaderboard entries with pagination.
     *
     * @param limit - Maximum number of entries to return (default: 10, max: 100)
     * @param offset - Pagination offset (default: 0)
     * @param leaderboardSlug - Optional leaderboard slug (uses default if not specified)
     * @returns Leaderboard entries with total count
     */
    getLeaderboard(limit?: number, offset?: number, leaderboardSlug?: string): Promise<LeaderboardResponse>;
    /**
     * Get a specific player's score and rank.
     *
     * @param playerGuid - Player's unique identifier
     * @param leaderboardSlug - Optional leaderboard slug (uses default if not specified)
     * @returns Player's score and rank, or null if not found
     */
    getPlayer(playerGuid: string, leaderboardSlug?: string): Promise<PlayerResponse | null>;
    /**
     * Update a player's display name.
     *
     * @param playerGuid - Player's unique identifier
     * @param newName - New display name
     * @param leaderboardSlug - Optional leaderboard slug (uses default if not specified)
     * @returns Updated player info
     */
    updatePlayerName(playerGuid: string, newName: string, leaderboardSlug?: string): Promise<PlayerResponse>;
    /**
     * Claim a migrated score by matching player name.
     * Used when scores were imported (e.g., from CSV) without player GUIDs.
     *
     * @param playerGuid - Player GUID to assign to the claimed score
     * @param playerName - Player name to match against migrated scores
     * @param leaderboardSlug - Optional leaderboard slug (uses default if not specified)
     * @returns Claim result with score and rank
     */
    claimScore(playerGuid: string, playerName: string, leaderboardSlug?: string): Promise<ClaimResponse>;
    /**
     * Check if the API is healthy.
     * This endpoint does not require an API key.
     *
     * @returns Health status with version and timestamp
     */
    healthCheck(): Promise<HealthResponse>;
    /**
     * Internal request helper with auth and error handling.
     */
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

export { type ApiErrorResponse, type ApiResponse, type ApiSuccessResponse, type ClaimRequest, type ClaimResponse, type HealthResponse, KeeperBoardClient, type KeeperBoardConfig, KeeperBoardError, type LeaderboardEntry, type LeaderboardResponse, PlayerIdentity, type PlayerIdentityConfig, type PlayerNameUpdate, type PlayerResponse, type ScoreResponse, type ScoreSubmission };
