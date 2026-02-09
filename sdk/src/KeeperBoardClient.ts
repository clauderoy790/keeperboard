/**
 * KeeperBoard API client for TypeScript/JavaScript games.
 * Works in any browser environment using the fetch API.
 */

import type {
  KeeperBoardConfig,
  ScoreSubmission,
  ScoreResponse,
  LeaderboardResponse,
  PlayerResponse,
  ClaimResponse,
  HealthResponse,
  ApiResponse,
} from './types';
import { KeeperBoardError } from './types';

export class KeeperBoardClient {
  private static readonly DEFAULT_API_URL = 'https://keeperboard.vercel.app';

  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(config: KeeperBoardConfig) {
    const url = config.apiUrl ?? KeeperBoardClient.DEFAULT_API_URL;
    this.apiUrl = url.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  // ============================================
  // SCORE SUBMISSION
  // ============================================

  /**
   * Submit a score to the default leaderboard.
   * Only updates if the new score is higher than the existing one.
   */
  submitScore(
    playerGuid: string,
    playerName: string,
    score: number
  ): Promise<ScoreResponse>;

  /**
   * Submit a score to a specific leaderboard.
   * Only updates if the new score is higher than the existing one.
   */
  submitScore(
    playerGuid: string,
    playerName: string,
    score: number,
    leaderboard: string
  ): Promise<ScoreResponse>;

  /**
   * Submit a score with metadata.
   * Only updates if the new score is higher than the existing one.
   */
  submitScore(
    playerGuid: string,
    playerName: string,
    score: number,
    leaderboard: string,
    metadata: Record<string, unknown>
  ): Promise<ScoreResponse>;

  async submitScore(
    playerGuid: string,
    playerName: string,
    score: number,
    leaderboard?: string,
    metadata?: Record<string, unknown>
  ): Promise<ScoreResponse> {
    const params = new URLSearchParams();
    if (leaderboard) {
      params.set('leaderboard', leaderboard);
    }

    const url = `${this.apiUrl}/api/v1/scores${params.toString() ? '?' + params.toString() : ''}`;

    const body: ScoreSubmission = {
      player_guid: playerGuid,
      player_name: playerName,
      score,
      ...(metadata && { metadata }),
    };

    return this.request<ScoreResponse>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // ============================================
  // LEADERBOARD
  // ============================================

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
  getLeaderboard(
    name: string,
    limit: number,
    offset: number
  ): Promise<LeaderboardResponse>;

  async getLeaderboard(
    name?: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<LeaderboardResponse> {
    const params = new URLSearchParams();
    params.set('limit', String(Math.min(limit, 100)));
    params.set('offset', String(offset));
    if (name) {
      params.set('leaderboard', name);
    }

    const url = `${this.apiUrl}/api/v1/leaderboard?${params.toString()}`;

    return this.request<LeaderboardResponse>(url, { method: 'GET' });
  }

  // ============================================
  // LEADERBOARD VERSION (for time-based boards)
  // ============================================

  /**
   * Get a specific version of a time-based leaderboard.
   *
   * @example
   * // Get last week's leaderboard (version 3)
   * const lastWeek = await client.getLeaderboardVersion('Weekly Best', 3);
   */
  getLeaderboardVersion(
    name: string,
    version: number
  ): Promise<LeaderboardResponse>;

  /**
   * Get a specific version with custom limit.
   */
  getLeaderboardVersion(
    name: string,
    version: number,
    limit: number
  ): Promise<LeaderboardResponse>;

  /**
   * Get a specific version with pagination.
   */
  getLeaderboardVersion(
    name: string,
    version: number,
    limit: number,
    offset: number
  ): Promise<LeaderboardResponse>;

  async getLeaderboardVersion(
    name: string,
    version: number,
    limit: number = 10,
    offset: number = 0
  ): Promise<LeaderboardResponse> {
    const params = new URLSearchParams();
    params.set('leaderboard', name);
    params.set('version', String(version));
    params.set('limit', String(Math.min(limit, 100)));
    params.set('offset', String(offset));

    const url = `${this.apiUrl}/api/v1/leaderboard?${params.toString()}`;

    return this.request<LeaderboardResponse>(url, { method: 'GET' });
  }

  // ============================================
  // PLAYER
  // ============================================

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
  getPlayerRank(
    playerGuid: string,
    leaderboard: string
  ): Promise<PlayerResponse | null>;

  async getPlayerRank(
    playerGuid: string,
    leaderboard?: string
  ): Promise<PlayerResponse | null> {
    const params = new URLSearchParams();
    if (leaderboard) {
      params.set('leaderboard', leaderboard);
    }

    const url = `${this.apiUrl}/api/v1/player/${encodeURIComponent(playerGuid)}${params.toString() ? '?' + params.toString() : ''}`;

    try {
      return await this.request<PlayerResponse>(url, { method: 'GET' });
    } catch (error) {
      if (error instanceof KeeperBoardError && error.code === 'NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update a player's display name on the default leaderboard.
   */
  updatePlayerName(
    playerGuid: string,
    newName: string
  ): Promise<PlayerResponse>;

  /**
   * Update a player's display name on a specific leaderboard.
   */
  updatePlayerName(
    playerGuid: string,
    newName: string,
    leaderboard: string
  ): Promise<PlayerResponse>;

  async updatePlayerName(
    playerGuid: string,
    newName: string,
    leaderboard?: string
  ): Promise<PlayerResponse> {
    const params = new URLSearchParams();
    if (leaderboard) {
      params.set('leaderboard', leaderboard);
    }

    const url = `${this.apiUrl}/api/v1/player/${encodeURIComponent(playerGuid)}${params.toString() ? '?' + params.toString() : ''}`;

    return this.request<PlayerResponse>(url, {
      method: 'PUT',
      body: JSON.stringify({ player_name: newName }),
    });
  }

  // ============================================
  // CLAIM (for migrated scores)
  // ============================================

  /**
   * Claim a migrated score by matching player name.
   * Used when scores were imported without player GUIDs.
   */
  claimScore(playerGuid: string, playerName: string): Promise<ClaimResponse>;

  /**
   * Claim a migrated score on a specific leaderboard.
   */
  claimScore(
    playerGuid: string,
    playerName: string,
    leaderboard: string
  ): Promise<ClaimResponse>;

  async claimScore(
    playerGuid: string,
    playerName: string,
    leaderboard?: string
  ): Promise<ClaimResponse> {
    const params = new URLSearchParams();
    if (leaderboard) {
      params.set('leaderboard', leaderboard);
    }

    const url = `${this.apiUrl}/api/v1/claim${params.toString() ? '?' + params.toString() : ''}`;

    return this.request<ClaimResponse>(url, {
      method: 'POST',
      body: JSON.stringify({
        player_guid: playerGuid,
        player_name: playerName,
      }),
    });
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  /**
   * Check if the API is healthy.
   * This endpoint does not require an API key.
   */
  async healthCheck(): Promise<HealthResponse> {
    const url = `${this.apiUrl}/api/v1/health`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const json = (await response.json()) as ApiResponse<HealthResponse>;

    if (!json.success) {
      throw new KeeperBoardError(json.error, json.code, response.status);
    }

    return json.data;
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
