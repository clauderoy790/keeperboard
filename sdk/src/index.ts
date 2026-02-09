/**
 * KeeperBoard SDK - TypeScript client for KeeperBoard leaderboard-as-a-service.
 *
 * @example
 * ```typescript
 * import { KeeperBoardClient, PlayerIdentity } from 'keeperboard';
 *
 * const client = new KeeperBoardClient({
 *   apiUrl: 'https://keeperboard.vercel.app',
 *   apiKey: 'kb_dev_your_api_key',
 * });
 *
 * // Submit a score
 * await client.submitScore(playerGuid, 'PlayerOne', 1500);
 *
 * // Get leaderboard
 * const lb = await client.getLeaderboard();
 *
 * // Get player's rank
 * const player = await client.getPlayerRank(playerGuid);
 * ```
 */

export { KeeperBoardClient } from './KeeperBoardClient';
export { PlayerIdentity } from './PlayerIdentity';
export type { PlayerIdentityConfig } from './PlayerIdentity';
export {
  KeeperBoardError,
  type KeeperBoardConfig,
  type ScoreSubmission,
  type ScoreResponse,
  type LeaderboardEntry,
  type LeaderboardResponse,
  type PlayerResponse,
  type ClaimResponse,
  type HealthResponse,
  type ResetSchedule,
} from './types';
