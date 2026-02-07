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
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(config: KeeperBoardConfig) {
    // Remove trailing slash from URL if present
    this.apiUrl = config.apiUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

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
  async submitScore(
    playerGuid: string,
    playerName: string,
    score: number,
    metadata?: Record<string, unknown>,
    leaderboardSlug?: string
  ): Promise<ScoreResponse> {
    const params = new URLSearchParams();
    if (leaderboardSlug) {
      params.set('leaderboard', leaderboardSlug);
    }

    const url = `${this.apiUrl}/api/v1/scores${params.toString() ? '?' + params.toString() : ''}`;

    const body: ScoreSubmission = {
      player_guid: playerGuid,
      player_name: playerName,
      score,
      ...(metadata && { metadata }),
    };

    const response = await this.request<ScoreResponse>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return response;
  }

  /**
   * Get the leaderboard entries with pagination.
   *
   * @param limit - Maximum number of entries to return (default: 10, max: 100)
   * @param offset - Pagination offset (default: 0)
   * @param leaderboardSlug - Optional leaderboard slug (uses default if not specified)
   * @returns Leaderboard entries with total count
   */
  async getLeaderboard(
    limit: number = 10,
    offset: number = 0,
    leaderboardSlug?: string
  ): Promise<LeaderboardResponse> {
    const params = new URLSearchParams();
    params.set('limit', String(Math.min(limit, 100)));
    params.set('offset', String(offset));
    if (leaderboardSlug) {
      params.set('leaderboard', leaderboardSlug);
    }

    const url = `${this.apiUrl}/api/v1/leaderboard?${params.toString()}`;

    return this.request<LeaderboardResponse>(url, {
      method: 'GET',
    });
  }

  /**
   * Get a specific player's score and rank.
   *
   * @param playerGuid - Player's unique identifier
   * @param leaderboardSlug - Optional leaderboard slug (uses default if not specified)
   * @returns Player's score and rank, or null if not found
   */
  async getPlayer(
    playerGuid: string,
    leaderboardSlug?: string
  ): Promise<PlayerResponse | null> {
    const params = new URLSearchParams();
    if (leaderboardSlug) {
      params.set('leaderboard', leaderboardSlug);
    }

    const url = `${this.apiUrl}/api/v1/player/${encodeURIComponent(playerGuid)}${params.toString() ? '?' + params.toString() : ''}`;

    try {
      return await this.request<PlayerResponse>(url, {
        method: 'GET',
      });
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
   * @param playerGuid - Player's unique identifier
   * @param newName - New display name
   * @param leaderboardSlug - Optional leaderboard slug (uses default if not specified)
   * @returns Updated player info
   */
  async updatePlayerName(
    playerGuid: string,
    newName: string,
    leaderboardSlug?: string
  ): Promise<PlayerResponse> {
    const params = new URLSearchParams();
    if (leaderboardSlug) {
      params.set('leaderboard', leaderboardSlug);
    }

    const url = `${this.apiUrl}/api/v1/player/${encodeURIComponent(playerGuid)}${params.toString() ? '?' + params.toString() : ''}`;

    return this.request<PlayerResponse>(url, {
      method: 'PUT',
      body: JSON.stringify({ player_name: newName }),
    });
  }

  /**
   * Claim a migrated score by matching player name.
   * Used when scores were imported (e.g., from CSV) without player GUIDs.
   *
   * @param playerGuid - Player GUID to assign to the claimed score
   * @param playerName - Player name to match against migrated scores
   * @param leaderboardSlug - Optional leaderboard slug (uses default if not specified)
   * @returns Claim result with score and rank
   */
  async claimScore(
    playerGuid: string,
    playerName: string,
    leaderboardSlug?: string
  ): Promise<ClaimResponse> {
    const params = new URLSearchParams();
    if (leaderboardSlug) {
      params.set('leaderboard', leaderboardSlug);
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

  /**
   * Check if the API is healthy.
   * This endpoint does not require an API key.
   *
   * @returns Health status with version and timestamp
   */
  async healthCheck(): Promise<HealthResponse> {
    const url = `${this.apiUrl}/api/v1/health`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    const json = (await response.json()) as ApiResponse<HealthResponse>;

    if (!json.success) {
      throw new KeeperBoardError(json.error, json.code, response.status);
    }

    return json.data;
  }

  /**
   * Internal request helper with auth and error handling.
   */
  private async request<T>(
    url: string,
    options: RequestInit
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-API-Key': this.apiKey,
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    });

    const json = (await response.json()) as ApiResponse<T>;

    if (!json.success) {
      throw new KeeperBoardError(json.error, json.code, response.status);
    }

    return json.data;
  }
}
