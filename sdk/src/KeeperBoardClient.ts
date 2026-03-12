/**
 * KeeperBoard API client for TypeScript/JavaScript games.
 * Works in any browser environment using the fetch API.
 *
 * All public methods accept options objects and return camelCase results.
 * A `defaultLeaderboard` can be set in the config to avoid passing it every call.
 */

import type {
  KeeperBoardConfig,
  ScoreSubmission,
  ApiScoreResponse,
  ApiLeaderboardResponse,
  ApiPlayerResponse,
  ApiClaimResponse,
  ApiHealthResponse,
  ApiStartRunResponse,
  ApiFinishRunResponse,
  ApiResponse,
  SubmitScoreOptions,
  GetLeaderboardOptions,
  GetPlayerRankOptions,
  UpdatePlayerNameOptions,
  ClaimScoreOptions,
  StartRunOptions,
  FinishRunOptions,
  ScoreResult,
  LeaderboardResult,
  LeaderboardEntry,
  PlayerResult,
  ClaimResult,
  HealthResult,
  StartRunResult,
  FinishRunResult,
} from './types';
import { KeeperBoardError } from './types';
import { signRequest } from './signing';

export class KeeperBoardClient {
  private static readonly DEFAULT_API_URL = 'https://keeperboard.vercel.app';

  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly defaultLeaderboard?: string;
  private readonly signingSecret?: string;

  constructor(config: KeeperBoardConfig) {
    const url = config.apiUrl ?? KeeperBoardClient.DEFAULT_API_URL;
    this.apiUrl = url.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.defaultLeaderboard = config.defaultLeaderboard;
    this.signingSecret = config.signingSecret;
  }

  // ============================================
  // SCORE SUBMISSION
  // ============================================

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
  async submitScore(options: SubmitScoreOptions): Promise<ScoreResult> {
    const leaderboard = options.leaderboard ?? this.defaultLeaderboard;
    const params = new URLSearchParams();
    if (leaderboard) params.set('leaderboard', leaderboard);

    const url = `${this.apiUrl}/api/v1/scores${params.toString() ? '?' + params.toString() : ''}`;

    const body: ScoreSubmission = {
      player_guid: options.playerGuid,
      player_name: options.playerName,
      score: options.score,
      ...(options.metadata && { metadata: options.metadata }),
    };

    const raw = await this.request<ApiScoreResponse>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return this.mapScoreResponse(raw);
  }

  // ============================================
  // LEADERBOARD
  // ============================================

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
  async getLeaderboard(options?: GetLeaderboardOptions): Promise<LeaderboardResult> {
    const leaderboard = options?.leaderboard ?? this.defaultLeaderboard;
    const limit = options?.limit ?? 10;
    const offset = options?.offset ?? 0;

    const params = new URLSearchParams();
    params.set('limit', String(Math.min(limit, 100)));
    params.set('offset', String(offset));
    if (leaderboard) params.set('leaderboard', leaderboard);
    if (options?.version !== undefined) params.set('version', String(options.version));

    const url = `${this.apiUrl}/api/v1/leaderboard?${params.toString()}`;
    const raw = await this.request<ApiLeaderboardResponse>(url, { method: 'GET' });

    return this.mapLeaderboardResponse(raw);
  }

  // ============================================
  // PLAYER
  // ============================================

  /**
   * Get a player's rank and score. Returns `null` if the player has no score.
   *
   * @example
   * const player = await client.getPlayerRank({ playerGuid: 'abc-123' });
   * if (player) console.log(`Rank #${player.rank}`);
   */
  async getPlayerRank(options: GetPlayerRankOptions): Promise<PlayerResult | null> {
    const leaderboard = options.leaderboard ?? this.defaultLeaderboard;
    const params = new URLSearchParams();
    if (leaderboard) params.set('leaderboard', leaderboard);

    const url = `${this.apiUrl}/api/v1/player/${encodeURIComponent(options.playerGuid)}${params.toString() ? '?' + params.toString() : ''}`;

    try {
      const raw = await this.request<ApiPlayerResponse>(url, { method: 'GET' });
      return this.mapPlayerResponse(raw);
    } catch (error) {
      if (error instanceof KeeperBoardError && error.code === 'NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update a player's display name.
   *
   * @example
   * const player = await client.updatePlayerName({
   *   playerGuid: 'abc-123',
   *   newName: 'MAVERICK',
   * });
   */
  async updatePlayerName(options: UpdatePlayerNameOptions): Promise<PlayerResult> {
    const leaderboard = options.leaderboard ?? this.defaultLeaderboard;
    const params = new URLSearchParams();
    if (leaderboard) params.set('leaderboard', leaderboard);

    const url = `${this.apiUrl}/api/v1/player/${encodeURIComponent(options.playerGuid)}${params.toString() ? '?' + params.toString() : ''}`;

    const raw = await this.request<ApiPlayerResponse>(url, {
      method: 'PUT',
      body: JSON.stringify({ player_name: options.newName }),
    });

    return this.mapPlayerResponse(raw);
  }

  // ============================================
  // CLAIM (for migrated scores)
  // ============================================

  /**
   * Claim a migrated score by matching player name.
   * Used when scores were imported without player GUIDs.
   */
  async claimScore(options: ClaimScoreOptions): Promise<ClaimResult> {
    const leaderboard = options.leaderboard ?? this.defaultLeaderboard;
    const params = new URLSearchParams();
    if (leaderboard) params.set('leaderboard', leaderboard);

    const url = `${this.apiUrl}/api/v1/claim${params.toString() ? '?' + params.toString() : ''}`;

    const raw = await this.request<ApiClaimResponse>(url, {
      method: 'POST',
      body: JSON.stringify({
        player_guid: options.playerGuid,
        player_name: options.playerName,
      }),
    });

    return this.mapClaimResponse(raw);
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  /**
   * Check if the API is healthy. Does not require an API key.
   */
  async healthCheck(): Promise<HealthResult> {
    const url = `${this.apiUrl}/api/v1/health`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const json = (await response.json()) as ApiResponse<ApiHealthResponse>;

    if (!json.success) {
      throw new KeeperBoardError(json.error, json.code, response.status);
    }

    return json.data; // HealthResult and ApiHealthResponse are the same shape
  }

  // ============================================
  // ANTI-CHEAT: RUN TOKENS
  // ============================================

  /**
   * Start a game run. Use this when the leaderboard requires run tokens.
   * Returns a run ID that must be passed to finishRun() when submitting the score.
   *
   * @example
   * const run = await client.startRun({ playerGuid: 'abc-123' });
   * // ... play game ...
   * const result = await client.finishRun({
   *   runId: run.runId,
   *   playerGuid: 'abc-123',
   *   playerName: 'ACE',
   *   score: 1500,
   * });
   */
  async startRun(options: StartRunOptions): Promise<StartRunResult> {
    const leaderboard = options.leaderboard ?? this.defaultLeaderboard;
    const params = new URLSearchParams();
    if (leaderboard) params.set('leaderboard', leaderboard);

    const url = `${this.apiUrl}/api/v1/runs/start${params.toString() ? '?' + params.toString() : ''}`;

    const timestamp = Date.now();
    const body: Record<string, unknown> = {
      player_guid: options.playerGuid,
      timestamp,
    };

    const headers: Record<string, string> = {};
    if (this.signingSecret) {
      const signature = await signRequest(
        { playerGuid: options.playerGuid, timestamp },
        this.signingSecret
      );
      headers['X-Signature'] = signature;
    }

    const raw = await this.request<ApiStartRunResponse>(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });

    return this.mapStartRunResponse(raw);
  }

  /**
   * Finish a game run and submit the score.
   * The run must have been started with startRun() first.
   *
   * @example
   * const result = await client.finishRun({
   *   runId: run.runId,
   *   playerGuid: 'abc-123',
   *   playerName: 'ACE',
   *   score: 1500,
   * });
   * console.log(result.rank, result.isNewHighScore);
   */
  async finishRun(options: FinishRunOptions): Promise<FinishRunResult> {
    const leaderboard = options.leaderboard ?? this.defaultLeaderboard;
    const params = new URLSearchParams();
    if (leaderboard) params.set('leaderboard', leaderboard);

    const url = `${this.apiUrl}/api/v1/runs/finish${params.toString() ? '?' + params.toString() : ''}`;

    const timestamp = Date.now();
    const body: Record<string, unknown> = {
      run_id: options.runId,
      player_guid: options.playerGuid,
      player_name: options.playerName,
      score: options.score,
      timestamp,
      ...(options.metadata && { metadata: options.metadata }),
    };

    const headers: Record<string, string> = {};
    if (this.signingSecret) {
      const signature = await signRequest(
        {
          playerGuid: options.playerGuid,
          timestamp,
          score: options.score,
          runId: options.runId,
        },
        this.signingSecret
      );
      headers['X-Signature'] = signature;
    }

    const raw = await this.request<ApiFinishRunResponse>(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });

    return this.mapFinishRunResponse(raw);
  }

  // ============================================
  // RESPONSE MAPPERS (snake_case → camelCase)
  // ============================================

  private mapScoreResponse(raw: ApiScoreResponse): ScoreResult {
    return {
      id: raw.id,
      playerGuid: raw.player_guid,
      playerName: raw.player_name,
      score: raw.score,
      rank: raw.rank,
      isNewHighScore: raw.is_new_high_score,
    };
  }

  private mapLeaderboardResponse(raw: ApiLeaderboardResponse): LeaderboardResult {
    return {
      entries: raw.entries.map((e): LeaderboardEntry => ({
        rank: e.rank,
        playerGuid: e.player_guid,
        playerName: e.player_name,
        score: e.score,
      })),
      totalCount: raw.total_count,
      resetSchedule: raw.reset_schedule,
      version: raw.version,
      oldestVersion: raw.oldest_version,
      nextReset: raw.next_reset,
    };
  }

  private mapPlayerResponse(raw: ApiPlayerResponse): PlayerResult {
    return {
      id: raw.id,
      playerGuid: raw.player_guid,
      playerName: raw.player_name,
      score: raw.score,
      rank: raw.rank,
    };
  }

  private mapClaimResponse(raw: ApiClaimResponse): ClaimResult {
    return {
      claimed: raw.claimed,
      score: raw.score,
      rank: raw.rank,
      playerName: raw.player_name,
    };
  }

  private mapStartRunResponse(raw: ApiStartRunResponse): StartRunResult {
    return {
      runId: raw.run_id,
      startedAt: raw.started_at,
      expiresAt: raw.expires_at,
    };
  }

  private mapFinishRunResponse(raw: ApiFinishRunResponse): FinishRunResult {
    return {
      scoreId: raw.score_id,
      rank: raw.rank,
      isNewHighScore: raw.is_new_high_score,
    };
  }

  // ============================================
  // INTERNAL
  // ============================================

  private async request<T>(url: string, options: RequestInit): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-API-Key': this.apiKey,
    };

    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
    });

    const json = (await response.json()) as ApiResponse<T>;

    if (!json.success) {
      throw new KeeperBoardError(json.error, json.code, response.status);
    }

    return json.data;
  }
}
