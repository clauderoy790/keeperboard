/**
 * KeeperBoard SDK v2 - Advanced Example (Low-Level Client)
 *
 * Use KeeperBoardClient when you need:
 * - Server-side usage (Node.js, serverless functions)
 * - Full control over caching and retries
 * - Multi-leaderboard operations in a single app
 * - Custom identity management
 */

import {
  KeeperBoardClient,
  PlayerIdentity,
  KeeperBoardError,
  validateName,
  type ScoreResult,
  type LeaderboardResult,
  type PlayerResult,
} from '../src/index';

// ============================================================================
// CLIENT SETUP
// ============================================================================

const client = new KeeperBoardClient({
  apiKey: 'kb_dev_your_api_key_here',
  defaultLeaderboard: 'main', // Used when leaderboard not specified
});

// Optional: manual identity management
const identity = new PlayerIdentity({ keyPrefix: 'myapp_' });

// ============================================================================
// SCORE SUBMISSION (options object API)
// ============================================================================

async function submitScore(): Promise<void> {
  const result: ScoreResult = await client.submitScore({
    playerGuid: identity.getOrCreatePlayerGuid(),
    playerName: identity.getPlayerName() ?? 'ANON',
    score: 1500,
    metadata: { level: 5, character: 'ace' },
    // leaderboard: 'weekly',  // Override defaultLeaderboard if needed
  });

  console.log('Score submitted:');
  console.log(`  Rank: #${result.rank}`);
  console.log(`  Score: ${result.score}`);
  console.log(`  New high: ${result.isNewHighScore}`);
  console.log(`  Player GUID: ${result.playerGuid}`);
  console.log(`  Player name: ${result.playerName}`);
}

// ============================================================================
// LEADERBOARD (camelCase responses)
// ============================================================================

async function getLeaderboard(): Promise<void> {
  // Simple: top 10 from default leaderboard
  const lb: LeaderboardResult = await client.getLeaderboard();

  console.log(`Leaderboard (${lb.totalCount} players):`);
  console.log(`  Reset schedule: ${lb.resetSchedule}`);

  lb.entries.forEach((e) => {
    console.log(`  #${e.rank} ${e.playerName}: ${e.score}`);
  });
}

async function getLeaderboardWithOptions(): Promise<void> {
  const lb = await client.getLeaderboard({
    leaderboard: 'weekly',
    limit: 25,
    offset: 0,
  });

  console.log(`Weekly leaderboard: ${lb.entries.length} entries`);
}

async function getHistoricalLeaderboard(): Promise<void> {
  // For time-based leaderboards, fetch a specific version
  const lb = await client.getLeaderboard({
    leaderboard: 'weekly',
    version: 3, // Last week
    limit: 10,
  });

  console.log(`Week 3 leaderboard: ${lb.entries.length} entries`);
  if (lb.nextReset) {
    console.log(`  Next reset: ${lb.nextReset}`);
  }
}

// ============================================================================
// PLAYER RANK
// ============================================================================

async function getPlayerRank(): Promise<void> {
  const player: PlayerResult | null = await client.getPlayerRank({
    playerGuid: identity.getOrCreatePlayerGuid(),
  });

  if (player) {
    console.log(`Your rank: #${player.rank}`);
    console.log(`Your score: ${player.score}`);
  } else {
    console.log('No score on this leaderboard yet');
  }
}

// ============================================================================
// UPDATE PLAYER NAME
// ============================================================================

async function updatePlayerName(): Promise<void> {
  const newName = validateName('  New Name! ');

  if (!newName) {
    console.error('Invalid name');
    return;
  }

  const player = await client.updatePlayerName({
    playerGuid: identity.getOrCreatePlayerGuid(),
    newName,
  });

  // Update local storage
  identity.setPlayerName(newName);

  console.log(`Name updated to: ${player.playerName}`);
}

// ============================================================================
// CLAIM MIGRATED SCORE
// ============================================================================

async function claimScore(): Promise<void> {
  try {
    const result = await client.claimScore({
      playerGuid: identity.getOrCreatePlayerGuid(),
      playerName: 'OldPlayerName', // Must match migrated score
    });

    if (result.claimed) {
      console.log(`Claimed score: ${result.score}, rank #${result.rank}`);
    }
  } catch (error) {
    if (error instanceof KeeperBoardError) {
      if (error.code === 'NOT_FOUND') {
        console.log('No unclaimed score for this name');
      } else if (error.code === 'ALREADY_CLAIMED') {
        console.log('Player already has a score');
      }
    }
  }
}

// ============================================================================
// MULTI-LEADERBOARD EXAMPLE
// ============================================================================

async function multiLeaderboardExample(): Promise<void> {
  const playerGuid = identity.getOrCreatePlayerGuid();
  const playerName = identity.getPlayerName() ?? 'ANON';

  // Submit to multiple leaderboards
  const [mainResult, weeklyResult, endlessResult] = await Promise.all([
    client.submitScore({ playerGuid, playerName, score: 1000 }),
    client.submitScore({ playerGuid, playerName, score: 500, leaderboard: 'weekly' }),
    client.submitScore({ playerGuid, playerName, score: 2000, leaderboard: 'endless' }),
  ]);

  console.log('Multi-leaderboard submission:');
  console.log(`  Main: rank #${mainResult.rank}`);
  console.log(`  Weekly: rank #${weeklyResult.rank}`);
  console.log(`  Endless: rank #${endlessResult.rank}`);
}

// ============================================================================
// SERVER-SIDE EXAMPLE (Node.js)
// ============================================================================

async function serverSideValidation(
  playerGuid: string,
  playerName: string,
  score: number
): Promise<ScoreResult> {
  // Server-side: don't trust client-provided names, validate first
  const validatedName = validateName(playerName);

  if (!validatedName) {
    throw new Error('Invalid player name');
  }

  // Submit with validated name
  return client.submitScore({
    playerGuid,
    playerName: validatedName,
    score,
  });
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

async function errorHandlingExample(): Promise<void> {
  try {
    await client.getLeaderboard({ leaderboard: 'nonexistent' });
  } catch (error) {
    if (error instanceof KeeperBoardError) {
      console.error(`Error [${error.code}]: ${error.message}`);
      console.error(`HTTP status: ${error.statusCode}`);

      switch (error.code) {
        case 'INVALID_API_KEY':
          // Prompt user to check settings
          break;
        case 'NOT_FOUND':
          // Leaderboard doesn't exist
          break;
        case 'INVALID_REQUEST':
          // Bad parameters
          break;
        case 'INTERNAL_ERROR':
          // Server error, retry later
          break;
      }
    }
  }
}

// ============================================================================
// COMPLETE EXAMPLE FLOW
// ============================================================================

async function main(): Promise<void> {
  console.log('=== KeeperBoard Client (Advanced) ===\n');

  // Health check
  const health = await client.healthCheck();
  console.log(`API version: ${health.version}\n`);

  // Submit score
  await submitScore();
  console.log('');

  // Get leaderboard
  await getLeaderboard();
  console.log('');

  // Get player rank
  await getPlayerRank();
  console.log('');

  console.log('=== Done ===');
}

export {
  client,
  identity,
  submitScore,
  getLeaderboard,
  getLeaderboardWithOptions,
  getHistoricalLeaderboard,
  getPlayerRank,
  updatePlayerName,
  claimScore,
  multiLeaderboardExample,
  serverSideValidation,
  errorHandlingExample,
  main,
};
