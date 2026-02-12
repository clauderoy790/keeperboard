/**
 * KeeperBoard SDK v2 - Phaser.js Integration Example
 *
 * This example demonstrates using KeeperBoardSession for browser games.
 * Compare this ~60 lines to the v1 example's ~633 lines!
 *
 * KeeperBoardSession provides:
 * - Automatic identity management (localStorage GUID + name)
 * - Built-in caching for instant leaderboard display
 * - Retry queue for offline/failed submissions
 * - Combined getSnapshot() for leaderboard + player rank
 * - Name validation
 */

import { KeeperBoardSession, KeeperBoardError } from '../src/index';

// ============================================================================
// SETUP - One-time initialization
// ============================================================================

const leaderboard = new KeeperBoardSession({
  apiKey: 'kb_dev_your_api_key_here', // Replace with your API key
  leaderboard: 'main',
  cache: { ttlMs: 30000 },           // 30s cache for getSnapshot()
  retry: { maxAgeMs: 86400000 },     // 24h retry queue for failed submissions
});

// ============================================================================
// BOOT SCENE - Startup tasks
// ============================================================================

async function onGameStart(): Promise<void> {
  // Pre-fetch leaderboard data for instant display later
  leaderboard.prefetch();

  // Retry any pending score from a previous failed submission
  if (leaderboard.hasPendingScore()) {
    const result = await leaderboard.retryPendingScore();
    if (result?.success) {
      console.log('Pending score submitted! Rank:', result.rank);
    }
  }
}

// ============================================================================
// GAME OVER SCENE - Submit score and display leaderboard
// ============================================================================

async function onGameOver(score: number): Promise<void> {
  // Submit score (identity auto-injected, retry queue on failure)
  const result = await leaderboard.submitScore(score);

  if (result.success) {
    console.log(`Rank #${result.rank}`, result.isNewHighScore ? '- NEW HIGH SCORE!' : '');
  } else {
    console.warn('Score saved for retry:', result.error);
  }

  // Get combined leaderboard + player rank
  const snapshot = await leaderboard.getSnapshot({ limit: 10 });

  // Display entries
  snapshot.entries.forEach((entry) => {
    const marker = entry.isCurrentPlayer ? ' ← YOU' : '';
    console.log(`#${entry.rank} ${entry.playerName}: ${entry.score}${marker}`);
  });

  // Show player rank if outside top 10
  if (snapshot.playerRank) {
    console.log(`... #${snapshot.playerRank.rank} (you): ${snapshot.playerRank.score}`);
  }
}

// ============================================================================
// NAME INPUT - Validate and save player name
// ============================================================================

function onNameSubmit(input: string): boolean {
  const validated = leaderboard.validateName(input);

  if (!validated) {
    console.log('Invalid name. Use 2-12 alphanumeric characters.');
    return false;
  }

  leaderboard.setPlayerName(validated);
  console.log('Name set to:', validated);
  return true;
}

async function onNameChange(newName: string): Promise<boolean> {
  const validated = leaderboard.validateName(newName);
  if (!validated) return false;

  const success = await leaderboard.updatePlayerName(validated);
  if (success) {
    console.log('Name updated on server to:', validated);
  }
  return success;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

function handleError(error: unknown): void {
  if (error instanceof KeeperBoardError) {
    switch (error.code) {
      case 'INVALID_API_KEY':
        console.error('Check your API key');
        break;
      case 'NOT_FOUND':
        console.error('Leaderboard not found');
        break;
      default:
        console.error('API error:', error.message);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}

// ============================================================================
// EXAMPLE PHASER SCENE
// ============================================================================

class GameOverScene /* extends Phaser.Scene */ {
  private score: number = 0;

  // init(data: { score: number }) { this.score = data.score; }

  async create(): Promise<void> {
    try {
      await onGameOver(this.score);
    } catch (error) {
      handleError(error);
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  leaderboard,
  onGameStart,
  onGameOver,
  onNameSubmit,
  onNameChange,
  handleError,
  GameOverScene,
};
