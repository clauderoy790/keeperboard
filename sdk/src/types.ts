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

/**
 * Platforms a score can be submitted from.
 *
 * This describes the *build* you shipped, not the device it happens to run on — a web
 * build played in Safari on an iPhone is `'web'`, and only the native iOS app is `'ios'`.
 * The distinction matters because it is what tells you which store or channel a player
 * came through.
 */
export const PLATFORMS = [
  'web',
  'ios',
  'android',
  'windows',
  'macos',
  'linux',
] as const;

export type Platform = (typeof PLATFORMS)[number];

export interface KeeperBoardConfig {
  /** API key from the KeeperBoard dashboard (e.g., "kb_dev_abc123...") */
  apiKey: string;
  /**
   * Which build this is. Required — the SDK cannot detect it, because a native app
   * running in a webview and a mobile browser are indistinguishable from inside the page.
   *
   * Map your framework's value rather than passing it through: `Capacitor.getPlatform()`
   * and Electron's `process.platform` both return values outside this union.
   */
  platform: Platform;
  /** Default leaderboard name — used when no leaderboard is specified in method calls */
  defaultLeaderboard?: string;
  /** Build identifier, e.g. "1.4.2". Enables retention-by-version in the dashboard. */
  gameVersion?: string;
  /** Signing secret for HMAC request signing (get from dashboard when signing is enabled) */
  signingSecret?: string;
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

export interface StartRunOptions {
  playerGuid: string;
  /** Leaderboard name. Falls back to `defaultLeaderboard` from config. */
  leaderboard?: string;
  /**
   * First-touch acquisition tag. `KeeperBoardSession` supplies this automatically from
   * the `?ref=` parameter; pass it explicitly only when using the low-level client.
   */
  source?: string;
}

export interface FinishRunOptions {
  runId: string;
  playerGuid: string;
  playerName: string;
  score: number;
  /** Leaderboard name. Falls back to `defaultLeaderboard` from config. */
  leaderboard?: string;
  metadata?: Record<string, unknown>;
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

export interface StartRunResult {
  runId: string;
  startedAt: string;
  expiresAt: string;
}

export interface FinishRunResult {
  scoreId: string;
  rank: number;
  isNewHighScore: boolean;
}

// =============================================
// Error Codes
// =============================================

export type ErrorCode =
  | 'PROFANITY_DETECTED'
  | 'RATE_LIMITED'
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR';

// =============================================
// Session Types
// =============================================

export interface SessionConfig {
  /** API key from the KeeperBoard dashboard */
  apiKey: string;
  /** Leaderboard name (required — the session is bound to one board) */
  leaderboard: string;
  /**
   * Which build this is. Required — see {@link KeeperBoardConfig.platform}.
   *
   * @example
   * import { Capacitor } from '@capacitor/core';
   *
   * const platform =
   *   Capacitor.getPlatform() === 'ios' ? 'ios' :
   *   Capacitor.getPlatform() === 'android' ? 'android' : 'web';
   */
  platform: Platform;
  /** Build identifier, e.g. "1.4.2". Enables retention-by-version in the dashboard. */
  gameVersion?: string;
  /** PlayerIdentity config for localStorage key prefix */
  identity?: { keyPrefix?: string };
  /** TTL cache configuration for getSnapshot() */
  cache?: { ttlMs: number };
  /** Retry queue configuration for failed score submissions */
  retry?: { maxAgeMs?: number };
  /** Signing secret for HMAC request signing (get from dashboard when signing is enabled) */
  signingSecret?: string;
  /** @internal Base URL override for testing. */
  apiUrl?: string;
}

export type SessionScoreResult =
  | { success: true; rank: number; isNewHighScore: boolean }
  | { success: false; error: string; errorCode?: ErrorCode };

export type UpdateNameResult =
  | { success: true }
  | { success: false; error: string; errorCode?: ErrorCode };

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
  platform?: Platform;
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

/** @internal */
export interface ApiStartRunResponse {
  run_id: string;
  started_at: string;
  expires_at: string;
}

/** @internal */
export interface ApiFinishRunResponse {
  score_id: string;
  rank: number;
  is_new_high_score: boolean;
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
