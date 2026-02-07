/**
 * Type definitions for KeeperBoard SDK.
 * Matches the API response shapes from the KeeperBoard public API.
 */

// ----- Configuration -----

export interface KeeperBoardConfig {
  /** Base URL of the KeeperBoard API (e.g., "https://your-app.vercel.app") */
  apiUrl: string;
  /** API key from the KeeperBoard dashboard (e.g., "kb_dev_abc123...") */
  apiKey: string;
}

// ----- Request Types -----

export interface ScoreSubmission {
  /** Unique player identifier (UUID or custom string) */
  player_guid: string;
  /** Player display name */
  player_name: string;
  /** Score value */
  score: number;
  /** Optional metadata to attach to the score */
  metadata?: Record<string, unknown>;
}

export interface PlayerNameUpdate {
  /** New display name for the player */
  player_name: string;
}

export interface ClaimRequest {
  /** Player GUID to assign to the migrated score */
  player_guid: string;
  /** Player name to match against migrated scores */
  player_name: string;
}

// ----- Response Types -----

export interface ScoreResponse {
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

export interface LeaderboardEntry {
  /** Position on the leaderboard (1-indexed) */
  rank: number;
  /** Player's unique identifier */
  player_guid: string;
  /** Player's display name */
  player_name: string;
  /** Score value */
  score: number;
}

export interface LeaderboardResponse {
  /** Array of leaderboard entries */
  entries: LeaderboardEntry[];
  /** Total number of scores on this leaderboard */
  total_count: number;
}

export interface PlayerResponse {
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

export interface ClaimResponse {
  /** Whether the score was successfully claimed */
  claimed: boolean;
  /** The claimed score value */
  score: number;
  /** Player's rank after claiming */
  rank: number;
  /** The player name that was matched */
  player_name: string;
}

export interface HealthResponse {
  /** Service name */
  service: string;
  /** API version */
  version: string;
  /** Server timestamp */
  timestamp: string;
}

// ----- API Response Wrapper -----

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ----- Error Types -----

export class KeeperBoardError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'KeeperBoardError';
  }
}
