/**
 * KeeperBoard SDK — TypeScript client for KeeperBoard leaderboard-as-a-service.
 *
 * Two layers:
 * - **KeeperBoardSession** (recommended) — high-level API with identity, cache, and retry built in.
 * - **KeeperBoardClient** — low-level API client for server-side or advanced use.
 *
 * @example
 * ```typescript
 * import { KeeperBoardSession } from 'keeperboard';
 *
 * const session = new KeeperBoardSession({
 *   apiKey: 'kb_dev_your_api_key',
 *   leaderboard: 'main',
 * });
 *
 * await session.submitScore(1500);
 * const snapshot = await session.getSnapshot();
 * ```
 */

// High-level API
export { KeeperBoardSession } from './KeeperBoardSession';

// Low-level API
export { KeeperBoardClient } from './KeeperBoardClient';

// Identity helper
export { PlayerIdentity } from './PlayerIdentity';
export type { PlayerIdentityConfig } from './PlayerIdentity';

// Validation
export { validateName } from './validation';

// Cache
export { Cache } from './Cache';

// Retry
export { RetryQueue } from './RetryQueue';

// Error class (value export)
export { KeeperBoardError } from './types';

// Public types
export type {
  // Config
  KeeperBoardConfig,
  SessionConfig,

  // Options objects
  SubmitScoreOptions,
  GetLeaderboardOptions,
  GetPlayerRankOptions,
  UpdatePlayerNameOptions,
  ClaimScoreOptions,

  // Response types (camelCase)
  ScoreResult,
  LeaderboardEntry,
  LeaderboardResult,
  PlayerResult,
  ClaimResult,
  HealthResult,

  // Session types
  SessionScoreResult,
  SnapshotEntry,
  SnapshotResult,

  // Validation
  NameValidationOptions,

  // Utilities
  ResetSchedule,
} from './types';

// Deprecated v1 types (kept for migration)
export type {
  ScoreSubmission,
  ScoreResponse,
  LeaderboardResponse,
  PlayerResponse,
  ClaimResponse,
  HealthResponse,
} from './types';
