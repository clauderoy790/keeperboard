/**
 * KeeperBoard SDK - TypeScript client for KeeperBoard leaderboard-as-a-service.
 *
 * @example
 * ```typescript
 * import { KeeperBoardClient, PlayerIdentity } from 'keeperboard-sdk';
 *
 * const client = new KeeperBoardClient({
 *   apiUrl: 'https://keeperboard.vercel.app',
 *   apiKey: 'kb_dev_your_api_key',
 * });
 *
 * const identity = new PlayerIdentity();
 * const playerGuid = identity.getOrCreatePlayerGuid();
 *
 * await client.submitScore(playerGuid, 'Player1', 1500);
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
  type ApiResponse,
  type ApiSuccessResponse,
  type ApiErrorResponse,
  type PlayerNameUpdate,
  type ClaimRequest,
} from './types';
