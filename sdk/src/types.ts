/**
 * Type definitions for KeeperBoard SDK.
 *
 * Public types use camelCase. Internal types (prefixed with Api*) match the
 * snake_case shapes returned by the KeeperBoard REST API and are used only
 * for deserialization inside the client.
 */

// =============================================
// Configuration
// =============================================

export interface KeeperBoardConfig {
  /** API key from the KeeperBoard dashboard (e.g., "kb_dev_abc123...") */
  apiKey: string;
  /** Default leaderboard name — used when no leaderboard is specified in method calls */
  defaultLeaderboard?: string;
  /** @internal Base URL override for testing. Do not use in production. */
  apiUrl?: string;
}

// =============================================
// Options Objects (method parameters)
// =============================================

export interface SubmitScoreOptions {
  playerGuid: string;
  playerName: string;
  score: number;
  /** Leaderboard name. Falls back to `defaultLeaderboard` from config. */
  leaderboard?: string;
  metadata?: Record<string, unknown>;
}

export interface GetLeaderboardOptions {
  /** Leaderboard name. Falls back to `defaultLeaderboard` from config. */
  leaderboard?: string;
  /** Max entries to return (1–100, default 10). */
  limit?: number;
  /** Offset for pagination (default 0). */
  offset?: number;
  /** Fetch a specific version of a time-based leaderboard. */
  version?: number;
}

export interface GetPlayerRankOptions {
  playerGuid: string;
  /** Leaderboard name. Falls back to `defaultLeaderboard` from config. */
  leaderboard?: string;
}

export interface UpdatePlayerNameOptions {
  playerGuid: string;
  newName: string;
  /** Leaderboard name. Falls back to `defaultLeaderboard` from config. */
  leaderboard?: string;
}

export interface ClaimScoreOptions {
  playerGuid: string;
  playerName: string;
  /** Leaderboard name. Falls back to `defaultLeaderboard` from config. */
  leaderboard?: string;
}

// =============================================
// Public Response Types (camelCase)
// =============================================

export interface ScoreResult {
  id: string;
  playerGuid: string;
  playerName: string;
  score: number;
  rank: number;
  isNewHighScore: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  playerGuid: string;
  playerName: string;
  score: number;
}

/** Reset schedule options for leaderboards */
export type ResetSchedule = 'none' | 'daily' | 'weekly' | 'monthly';

export interface LeaderboardResult {
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

export interface PlayerResult {
  id: string;
  playerGuid: string;
  playerName: string;
  score: number;
  rank: number;
}

export interface ClaimResult {
  claimed: boolean;
  score: number;
  rank: number;
  playerName: string;
}

export interface HealthResult {
  service: string;
  version: string;
  timestamp: string;
}

// =============================================
// Session Types
// =============================================

export interface SessionConfig {
  /** API key from the KeeperBoard dashboard */
  apiKey: string;
  /** Leaderboard name (required — the session is bound to one board) */
  leaderboard: string;
  /** PlayerIdentity config for localStorage key prefix */
  identity?: { keyPrefix?: string };
  /** TTL cache configuration for getSnapshot() */
  cache?: { ttlMs: number };
  /** Retry queue configuration for failed score submissions */
  retry?: { maxAgeMs?: number };
  /** @internal Base URL override for testing. */
  apiUrl?: string;
}

export type SessionScoreResult =
  | { success: true; rank: number; isNewHighScore: boolean }
  | { success: false; error: string };

export interface SnapshotEntry {
  rank: number;
  playerGuid: string;
  playerName: string;
  score: number;
  isCurrentPlayer: boolean;
}

export interface SnapshotResult {
  entries: SnapshotEntry[];
  totalCount: number;
  /** Player's own rank info — included only when the player is outside the top N. */
  playerRank: PlayerResult | null;
}

// =============================================
// Name Validation
// =============================================

export interface NameValidationOptions {
  /** Minimum length after sanitization (default 2). */
  minLength?: number;
  /** Maximum length — input is truncated to this (default 12). */
  maxLength?: number;
  /** Regex of allowed characters applied after case conversion (default /[^A-Z0-9_]/g removes non-matching). */
  allowedPattern?: RegExp;
}

// =============================================
// @internal — API Response Types (snake_case)
// =============================================

/** @internal */
export interface ScoreSubmission {
  player_guid: string;
  player_name: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/** @internal */
export interface ApiScoreResponse {
  id: string;
  player_guid: string;
  player_name: string;
  score: number;
  rank: number;
  is_new_high_score: boolean;
}

/** @internal */
export interface ApiLeaderboardEntry {
  rank: number;
  player_guid: string;
  player_name: string;
  score: number;
}

/** @internal */
export interface ApiLeaderboardResponse {
  entries: ApiLeaderboardEntry[];
  total_count: number;
  reset_schedule: ResetSchedule;
  version?: number;
  oldest_version?: number;
  next_reset?: string;
}

/** @internal */
export interface ApiPlayerResponse {
  id: string;
  player_guid: string;
  player_name: string;
  score: number;
  rank: number;
}

/** @internal */
export interface ApiClaimResponse {
  claimed: boolean;
  score: number;
  rank: number;
  player_name: string;
}

/** @internal */
export interface ApiHealthResponse {
  service: string;
  version: string;
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

// =============================================
// Legacy type aliases (v1 compat — deprecated)
// =============================================

/** @deprecated Use `ApiScoreResponse` (internal) or `ScoreResult` (public). */
export type ScoreResponse = ApiScoreResponse;
/** @deprecated Use `ApiLeaderboardResponse` (internal) or `LeaderboardResult` (public). */
export type LeaderboardResponse = ApiLeaderboardResponse;
/** @deprecated Use `ApiPlayerResponse` (internal) or `PlayerResult` (public). */
export type PlayerResponse = ApiPlayerResponse;
/** @deprecated Use `ApiClaimResponse` (internal) or `ClaimResult` (public). */
export type ClaimResponse = ApiClaimResponse;
/** @deprecated Use `ApiHealthResponse` (internal) or `HealthResult` (public). */
export type HealthResponse = ApiHealthResponse;
