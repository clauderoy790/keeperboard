/**
 * KeeperBoard SDK v2 - Session Example (High-Level API)
 *
 * Use KeeperBoardSession for browser games. It provides:
 * - Automatic identity management (localStorage GUID + name)
 * - Built-in caching for instant leaderboard display
 * - Retry queue for offline/failed submissions
 * - Combined getSnapshot() for leaderboard + player rank
 * - Name validation
 *
 * This is the RECOMMENDED API for most browser games.
 * For server-side or advanced use cases, see advanced-example.ts.
 */

import {
  KeeperBoardSession,
  KeeperBoardError,
  type SnapshotResult,
  type SessionScoreResult,
} from '../src/index';

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Create a single session instance for your game.
 * This handles identity, caching, and retries automatically.
 */
const session = new KeeperBoardSession({
  // Required
  apiKey: process.env.KEEPERBOARD_API_KEY || 'kb_dev_your_api_key_here',
  leaderboard: 'main',

  // Optional: caching
  cache: {
    ttlMs: 30_000, // 30 seconds - cached snapshots refresh after this
  },

  // Optional: retry queue for failed submissions
  retry: {
    maxAgeMs: 24 * 60 * 60 * 1000, // 24 hours - pending scores expire after this
  },

  // Optional: custom identity storage prefix
  identity: {
    keyPrefix: 'mygame_', // localStorage keys: mygame_player_guid, mygame_player_name
  },

  // Optional: default name for new players
  defaultPlayerName: 'GUEST',
});

// ============================================================================
// IDENTITY MANAGEMENT
// ============================================================================

function identityExamples(): void {
  // Player GUID is auto-generated and persisted in localStorage
  const guid = session.getPlayerGuid();
  console.log('Player GUID:', guid);

  // Get current name (falls back to defaultPlayerName if not set)
  const name = session.getPlayerName();
  console.log('Player name:', name);

  // Set name locally (does NOT update server)
  session.setPlayerName('ACE_PILOT');

  // Validate name input before accepting
  const input = '  New Player!  ';
  const validated = session.validateName(input);
  if (validated) {
    session.setPlayerName(validated);
    console.log('Name set to:', validated); // "NEW_PLAYER"
  } else {
    console.log('Invalid name');
  }

  // Custom validation options
  const custom = session.validateName('abc', {
    minLength: 2,
    maxLength: 8,
    uppercase: false, // Keep original case
  });
  console.log('Custom validated:', custom); // "abc"
}

// ============================================================================
// SCORE SUBMISSION
// ============================================================================

async function submitScoreExample(): Promise<void> {
  const score = 1500;

  // Submit with auto-injected identity
  const result: SessionScoreResult = await session.submitScore(score);

  if (result.success) {
    console.log('Score submitted!');
    console.log(`  Rank: #${result.rank}`);
    console.log(`  New high score: ${result.isNewHighScore}`);
  } else {
    // Failed - score saved to retry queue (if enabled)
    console.warn('Submission failed:', result.error);
    console.log('Score saved for retry:', session.hasPendingScore());
  }
}

async function submitWithMetadataExample(): Promise<void> {
  // Attach metadata to the score
  const result = await session.submitScore(2500, {
    level: 10,
    character: 'warrior',
    timeElapsed: 125.5,
  });

  if (result.success) {
    console.log('Score with metadata submitted!');
  }
}

// ============================================================================
// LEADERBOARD SNAPSHOT
// ============================================================================

async function getSnapshotExample(): Promise<void> {
  // Get combined leaderboard + player rank
  const snapshot: SnapshotResult = await session.getSnapshot({ limit: 10 });

  console.log(`Leaderboard (${snapshot.totalCount} players):`);

  // Display entries with current player marker
  snapshot.entries.forEach((entry) => {
    const marker = entry.isCurrentPlayer ? ' <- YOU' : '';
    console.log(`  #${entry.rank} ${entry.playerName}: ${entry.score}${marker}`);
  });

  // If current player is outside top N, show their rank separately
  if (snapshot.playerRank) {
    console.log('  ...');
    console.log(`  #${snapshot.playerRank.rank} ${snapshot.playerRank.playerName}: ${snapshot.playerRank.score} <- YOU`);
  }
}

async function cachingExample(): Promise<void> {
  // First call fetches from API
  console.time('First snapshot');
  await session.getSnapshot();
  console.timeEnd('First snapshot');

  // Second call returns cached data (instant)
  console.time('Cached snapshot');
  await session.getSnapshot();
  console.timeEnd('Cached snapshot');

  // Requesting more entries than cached triggers re-fetch
  console.time('Larger limit');
  await session.getSnapshot({ limit: 50 });
  console.timeEnd('Larger limit');
}

// ============================================================================
// PREFETCH & RETRY
// ============================================================================

async function startupExample(): Promise<void> {
  // Pre-fetch leaderboard data for instant display later
  // This runs in background - no await needed
  session.prefetch();

  // Retry any pending score from previous failed submission
  if (session.hasPendingScore()) {
    console.log('Retrying pending score...');
    const result = await session.retryPendingScore();

    if (result?.success) {
      console.log('Pending score submitted! Rank:', result.rank);
    } else if (result) {
      console.log('Retry failed, will try again later');
    }
  }
}

// ============================================================================
// UPDATE PLAYER NAME ON SERVER
// ============================================================================

async function updateNameExample(): Promise<void> {
  const newName = 'CHAMPION';

  // Validate first
  const validated = session.validateName(newName);
  if (!validated) {
    console.log('Invalid name');
    return;
  }

  // Update on server AND locally
  const success = await session.updatePlayerName(validated);

  if (success) {
    console.log('Name updated to:', session.getPlayerName());
  } else {
    console.log('Failed to update name');
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

async function errorHandlingExample(): Promise<void> {
  try {
    await session.getSnapshot();
  } catch (error) {
    if (error instanceof KeeperBoardError) {
      console.error(`API Error [${error.code}]: ${error.message}`);

      switch (error.code) {
        case 'INVALID_API_KEY':
          // Show settings screen
          break;
        case 'NOT_FOUND':
          // Leaderboard doesn't exist
          break;
        case 'RATE_LIMIT':
          // Too many requests - back off
          break;
        default:
          // Generic error handling
          break;
      }
    } else {
      // Network error or unexpected issue
      console.error('Unexpected error:', error);
    }
  }
}

// ============================================================================
// ESCAPE HATCH: ACCESS LOW-LEVEL CLIENT
// ============================================================================

async function advancedUsageExample(): Promise<void> {
  // For operations not covered by Session, access the underlying client
  const client = session.getClient();

  // Example: fetch from a different leaderboard
  const weeklyLeaderboard = await client.getLeaderboard({
    leaderboard: 'weekly',
    limit: 5,
  });

  console.log('Weekly top 5:', weeklyLeaderboard.entries.map(e => e.playerName));
}

// ============================================================================
// COMPLETE GAME FLOW EXAMPLE
// ============================================================================

async function completeGameFlow(): Promise<void> {
  console.log('=== KeeperBoard Session Example ===\n');

  // 1. Startup
  console.log('1. Startup');
  await startupExample();
  console.log('');

  // 2. Identity
  console.log('2. Identity');
  identityExamples();
  console.log('');

  // 3. Submit score
  console.log('3. Submit Score');
  await submitScoreExample();
  console.log('');

  // 4. Get snapshot
  console.log('4. Leaderboard Snapshot');
  await getSnapshotExample();
  console.log('');

  // 5. Caching demo
  console.log('5. Caching Demo');
  await cachingExample();
  console.log('');

  console.log('=== Done ===');
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  session,
  identityExamples,
  submitScoreExample,
  submitWithMetadataExample,
  getSnapshotExample,
  cachingExample,
  startupExample,
  updateNameExample,
  errorHandlingExample,
  advancedUsageExample,
  completeGameFlow,
};
