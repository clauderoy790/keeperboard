/**
 * KeeperBoard SDK - Phaser.js Integration Example
 *
 * This example demonstrates all SDK features in a Phaser.js game context.
 * The SDK works with any TypeScript/JavaScript game, not just Phaser.
 */

import {
  KeeperBoardClient,
  PlayerIdentity,
  KeeperBoardError,
  type ScoreResponse,
  type LeaderboardResponse,
  type PlayerResponse,
  type ClaimResponse,
  type HealthResponse,
} from '../src/index';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Initialize the client with your API key
const keeperboard = new KeeperBoardClient({
  apiKey: 'kb_dev_your_api_key_here', // Replace with your API key from dashboard
});

// Player identity helper for persistent player GUID
const playerIdentity = new PlayerIdentity();

// ============================================================================
// EXAMPLE 1: HEALTH CHECK
// ============================================================================

/**
 * Check if the KeeperBoard API is healthy.
 * This is the only endpoint that doesn't require an API key.
 */
async function checkHealth(): Promise<void> {
  try {
    const health: HealthResponse = await keeperboard.healthCheck();

    console.log('API Health Check:');
    console.log(`  Service: ${health.service}`);
    console.log(`  Version: ${health.version}`);
    console.log(`  Timestamp: ${health.timestamp}`);
  } catch (error) {
    console.error('Health check failed:', error);
  }
}

// ============================================================================
// EXAMPLE 2: SUBMIT SCORE
// ============================================================================

/**
 * Submit a score to the default leaderboard.
 * Only updates if the new score is higher than the existing one.
 */
async function submitScore(playerName: string, score: number): Promise<void> {
  try {
    // Get or create a persistent player GUID
    const playerGuid = playerIdentity.getOrCreatePlayerGuid();

    // Also store the player name locally
    playerIdentity.setPlayerName(playerName);

    // Submit the score
    const result: ScoreResponse = await keeperboard.submitScore(
      playerGuid,
      playerName,
      score
    );

    console.log('Score submitted:');
    console.log(`  Player: ${result.player_name}`);
    console.log(`  Score: ${result.score}`);
    console.log(`  Rank: #${result.rank}`);
    console.log(`  New high score: ${result.is_new_high_score ? 'Yes!' : 'No'}`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Submit a score with metadata (e.g., level, character, play time).
 */
async function submitScoreWithMetadata(
  playerName: string,
  score: number,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    const playerGuid = playerIdentity.getOrCreatePlayerGuid();

    const result: ScoreResponse = await keeperboard.submitScore(
      playerGuid,
      playerName,
      score,
      metadata // Pass metadata as 4th argument
    );

    console.log('Score with metadata submitted:');
    console.log(`  Score: ${result.score}, Rank: #${result.rank}`);
    console.log(`  Metadata was attached to the score`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Submit a score to a specific leaderboard by slug.
 */
async function submitScoreToLeaderboard(
  playerName: string,
  score: number,
  leaderboardSlug: string
): Promise<void> {
  try {
    const playerGuid = playerIdentity.getOrCreatePlayerGuid();

    const result: ScoreResponse = await keeperboard.submitScore(
      playerGuid,
      playerName,
      score,
      undefined, // No metadata
      leaderboardSlug // Specific leaderboard
    );

    console.log(`Score submitted to '${leaderboardSlug}' leaderboard:`);
    console.log(`  Rank: #${result.rank}`);
  } catch (error) {
    handleError(error);
  }
}

// ============================================================================
// EXAMPLE 3: GET LEADERBOARD
// ============================================================================

/**
 * Get the top 10 entries from the default leaderboard.
 */
async function getTopScores(): Promise<void> {
  try {
    const leaderboard: LeaderboardResponse = await keeperboard.getLeaderboard(10);

    console.log(`Leaderboard (${leaderboard.total_count} total players):`);
    console.log('─'.repeat(40));

    leaderboard.entries.forEach((entry) => {
      console.log(
        `  #${entry.rank} ${entry.player_name.padEnd(20)} ${entry.score}`
      );
    });
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get leaderboard with pagination.
 */
async function getLeaderboardPage(
  page: number,
  pageSize: number = 10
): Promise<void> {
  try {
    const offset = (page - 1) * pageSize;
    const leaderboard: LeaderboardResponse = await keeperboard.getLeaderboard(
      pageSize,
      offset
    );

    const totalPages = Math.ceil(leaderboard.total_count / pageSize);

    console.log(`Leaderboard Page ${page}/${totalPages}:`);
    leaderboard.entries.forEach((entry) => {
      console.log(`  #${entry.rank} ${entry.player_name}: ${entry.score}`);
    });
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get top 100 scores (maximum limit).
 */
async function getTop100(): Promise<void> {
  try {
    const leaderboard: LeaderboardResponse = await keeperboard.getLeaderboard(100);

    console.log(`Top 100 (of ${leaderboard.total_count} total):`);
    console.log(`  First: ${leaderboard.entries[0]?.player_name ?? 'N/A'}`);
    console.log(`  Last: ${leaderboard.entries[leaderboard.entries.length - 1]?.player_name ?? 'N/A'}`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get leaderboard for a specific leaderboard by slug.
 */
async function getSpecificLeaderboard(leaderboardSlug: string): Promise<void> {
  try {
    const leaderboard: LeaderboardResponse = await keeperboard.getLeaderboard(
      10,
      0,
      leaderboardSlug
    );

    console.log(`Leaderboard '${leaderboardSlug}':`);
    leaderboard.entries.forEach((entry) => {
      console.log(`  #${entry.rank} ${entry.player_name}: ${entry.score}`);
    });
  } catch (error) {
    handleError(error);
  }
}

// ============================================================================
// EXAMPLE 4: GET PLAYER
// ============================================================================

/**
 * Get the current player's score and rank.
 */
async function getMyScore(): Promise<void> {
  try {
    const playerGuid = playerIdentity.getPlayerGuid();

    if (!playerGuid) {
      console.log('No player identity found. Submit a score first.');
      return;
    }

    const player: PlayerResponse | null = await keeperboard.getPlayer(playerGuid);

    if (player) {
      console.log('Your score:');
      console.log(`  Name: ${player.player_name}`);
      console.log(`  Score: ${player.score}`);
      console.log(`  Rank: #${player.rank}`);
    } else {
      console.log('You have not submitted a score yet.');
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get any player's score by their GUID.
 */
async function getPlayerScore(playerGuid: string): Promise<void> {
  try {
    const player: PlayerResponse | null = await keeperboard.getPlayer(playerGuid);

    if (player) {
      console.log(`Player ${player.player_name}:`);
      console.log(`  Score: ${player.score}`);
      console.log(`  Rank: #${player.rank}`);
    } else {
      console.log('Player not found.');
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Get player score on a specific leaderboard.
 */
async function getPlayerOnLeaderboard(
  playerGuid: string,
  leaderboardSlug: string
): Promise<void> {
  try {
    const player: PlayerResponse | null = await keeperboard.getPlayer(
      playerGuid,
      leaderboardSlug
    );

    if (player) {
      console.log(`Player on '${leaderboardSlug}':`);
      console.log(`  Score: ${player.score}, Rank: #${player.rank}`);
    } else {
      console.log(`Player not found on '${leaderboardSlug}'.`);
    }
  } catch (error) {
    handleError(error);
  }
}

// ============================================================================
// EXAMPLE 5: UPDATE PLAYER NAME
// ============================================================================

/**
 * Update the current player's display name.
 */
async function updateMyName(newName: string): Promise<void> {
  try {
    const playerGuid = playerIdentity.getPlayerGuid();

    if (!playerGuid) {
      console.log('No player identity found. Submit a score first.');
      return;
    }

    const result: PlayerResponse = await keeperboard.updatePlayerName(
      playerGuid,
      newName
    );

    // Update local storage too
    playerIdentity.setPlayerName(newName);

    console.log('Name updated:');
    console.log(`  New name: ${result.player_name}`);
    console.log(`  Score: ${result.score}`);
    console.log(`  Rank: #${result.rank}`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Update player name on a specific leaderboard.
 */
async function updatePlayerNameOnLeaderboard(
  playerGuid: string,
  newName: string,
  leaderboardSlug: string
): Promise<void> {
  try {
    const result: PlayerResponse = await keeperboard.updatePlayerName(
      playerGuid,
      newName,
      leaderboardSlug
    );

    console.log(`Name updated on '${leaderboardSlug}':`);
    console.log(`  New name: ${result.player_name}`);
  } catch (error) {
    handleError(error);
  }
}

// ============================================================================
// EXAMPLE 6: CLAIM MIGRATED SCORE
// ============================================================================

/**
 * Claim a migrated score by matching player name.
 * Used when scores were imported without player GUIDs.
 */
async function claimMigratedScore(playerName: string): Promise<void> {
  try {
    const playerGuid = playerIdentity.getOrCreatePlayerGuid();

    const result: ClaimResponse = await keeperboard.claimScore(
      playerGuid,
      playerName
    );

    if (result.claimed) {
      console.log('Score claimed successfully!');
      console.log(`  Player: ${result.player_name}`);
      console.log(`  Score: ${result.score}`);
      console.log(`  Rank: #${result.rank}`);

      // Store the claimed name locally
      playerIdentity.setPlayerName(playerName);
    }
  } catch (error) {
    if (error instanceof KeeperBoardError) {
      if (error.code === 'NOT_FOUND') {
        console.log('No unclaimed score found for this player name.');
      } else if (error.code === 'ALREADY_CLAIMED') {
        console.log('This player already has a score on this leaderboard.');
      } else {
        handleError(error);
      }
    } else {
      handleError(error);
    }
  }
}

/**
 * Claim a migrated score on a specific leaderboard.
 */
async function claimScoreOnLeaderboard(
  playerName: string,
  leaderboardSlug: string
): Promise<void> {
  try {
    const playerGuid = playerIdentity.getOrCreatePlayerGuid();

    const result: ClaimResponse = await keeperboard.claimScore(
      playerGuid,
      playerName,
      leaderboardSlug
    );

    console.log(`Score claimed on '${leaderboardSlug}':`);
    console.log(`  Score: ${result.score}, Rank: #${result.rank}`);
  } catch (error) {
    handleError(error);
  }
}

// ============================================================================
// EXAMPLE 7: PLAYER IDENTITY MANAGEMENT
// ============================================================================

/**
 * Initialize player identity on game start.
 */
function initializePlayer(): { guid: string; name: string | null } {
  const guid = playerIdentity.getOrCreatePlayerGuid();
  const name = playerIdentity.getPlayerName();

  console.log('Player identity:');
  console.log(`  GUID: ${guid}`);
  console.log(`  Name: ${name ?? '(not set)'}`);

  return { guid, name };
}

/**
 * Check if player has an existing identity.
 */
function hasExistingPlayer(): boolean {
  return playerIdentity.hasIdentity();
}

/**
 * Clear player identity (e.g., for "Sign Out" feature).
 */
function clearPlayerIdentity(): void {
  playerIdentity.clear();
  console.log('Player identity cleared.');
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Central error handler for SDK errors.
 */
function handleError(error: unknown): void {
  if (error instanceof KeeperBoardError) {
    console.error(`KeeperBoard Error [${error.code}]: ${error.message}`);

    switch (error.code) {
      case 'INVALID_API_KEY':
        console.error('  → Check your API key in the dashboard');
        break;
      case 'NOT_FOUND':
        console.error('  → The requested resource was not found');
        break;
      case 'INVALID_REQUEST':
        console.error('  → Check the request parameters');
        break;
      case 'INTERNAL_ERROR':
        console.error('  → Server error, try again later');
        break;
      case 'ALREADY_CLAIMED':
        console.error('  → This player already has a score');
        break;
      default:
        console.error(`  → Unexpected error code: ${error.code}`);
    }
  } else if (error instanceof Error) {
    console.error('Network or unexpected error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}

// ============================================================================
// PHASER.JS GAME INTEGRATION EXAMPLE
// ============================================================================

/**
 * Example Phaser.js Scene demonstrating SDK integration.
 *
 * This shows how to:
 * - Submit score on game over
 * - Display leaderboard
 * - Handle player identity
 */
class GameOverScene /* extends Phaser.Scene */ {
  private playerScore: number = 0;

  constructor() {
    // super({ key: 'GameOverScene' });
  }

  // Called when transitioning to this scene
  // init(data: { score: number }): void {
  //   this.playerScore = data.score;
  // }

  async create(): Promise<void> {
    // Get player identity
    const { name } = initializePlayer();
    const playerName = name ?? 'Anonymous';

    // Submit the score
    try {
      const result = await keeperboard.submitScore(
        playerIdentity.getOrCreatePlayerGuid(),
        playerName,
        this.playerScore
      );

      // Display result
      console.log(`Game Over! Score: ${result.score}, Rank: #${result.rank}`);

      if (result.is_new_high_score) {
        console.log('NEW HIGH SCORE!');
      }

      // Load and display leaderboard
      await this.displayLeaderboard();
    } catch (error) {
      handleError(error);
    }
  }

  private async displayLeaderboard(): Promise<void> {
    try {
      const leaderboard = await keeperboard.getLeaderboard(10);

      console.log('\n=== LEADERBOARD ===');
      leaderboard.entries.forEach((entry) => {
        const isMe =
          entry.player_guid === playerIdentity.getPlayerGuid() ? ' ← YOU' : '';
        console.log(
          `#${entry.rank} ${entry.player_name}: ${entry.score}${isMe}`
        );
      });
    } catch (error) {
      handleError(error);
    }
  }
}

// ============================================================================
// COMPLETE FLOW EXAMPLE
// ============================================================================

/**
 * Demonstrates a complete game session flow.
 */
async function completeFlowExample(): Promise<void> {
  console.log('=== KeeperBoard SDK Complete Flow Example ===\n');

  // 1. Check API health
  console.log('1. Checking API health...');
  await checkHealth();
  console.log('');

  // 2. Initialize player
  console.log('2. Initializing player...');
  const { guid, name } = initializePlayer();
  const playerName = name ?? 'FlowTester';
  console.log('');

  // 3. Submit initial score
  console.log('3. Submitting initial score (1000)...');
  await submitScore(playerName, 1000);
  console.log('');

  // 4. Get player's current rank
  console.log('4. Getting player rank...');
  await getMyScore();
  console.log('');

  // 5. Submit higher score
  console.log('5. Submitting higher score (2500)...');
  await submitScore(playerName, 2500);
  console.log('');

  // 6. Submit lower score (should NOT update)
  console.log('6. Submitting lower score (500) - should not update...');
  await submitScore(playerName, 500);
  console.log('');

  // 7. View leaderboard
  console.log('7. Viewing leaderboard...');
  await getTopScores();
  console.log('');

  // 8. Update player name
  console.log('8. Updating player name...');
  await updateMyName('FlowTester Pro');
  console.log('');

  console.log('=== Flow Complete ===');
}

// Export for use in other files
export {
  keeperboard,
  playerIdentity,
  checkHealth,
  submitScore,
  submitScoreWithMetadata,
  submitScoreToLeaderboard,
  getTopScores,
  getLeaderboardPage,
  getTop100,
  getSpecificLeaderboard,
  getMyScore,
  getPlayerScore,
  getPlayerOnLeaderboard,
  updateMyName,
  updatePlayerNameOnLeaderboard,
  claimMigratedScore,
  claimScoreOnLeaderboard,
  initializePlayer,
  hasExistingPlayer,
  clearPlayerIdentity,
  handleError,
  completeFlowExample,
  GameOverScene,
};
