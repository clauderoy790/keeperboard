import Phaser from 'phaser';
import { KeeperBoardClient, PlayerIdentity } from 'keeperboard';
import type { LeaderboardEntry } from 'keeperboard';

// Game state
let client: KeeperBoardClient | null = null;
let identity: PlayerIdentity | null = null;
let playerName = '';
let score = 0;
let timeLeft = 30;
let gameActive = false;
let timerInterval: number | null = null;

// Phaser game config
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#16213e',
  scene: {
    create: createGame,
    update: updateGame,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
    },
  },
};

let game: Phaser.Game | null = null;
let targetSprite: Phaser.GameObjects.Sprite | null = null;
let scoreText: Phaser.GameObjects.Text | null = null;

// UI elements
const setupSection = document.getElementById('setup-section')!;
const gameSection = document.getElementById('game-section')!;
const leaderboardSection = document.getElementById('leaderboard-section')!;
const setupStatus = document.getElementById('setup-status')!;
const gameStatus = document.getElementById('game-status')!;
const currentPlayerSpan = document.getElementById('current-player')!;
const currentScoreSpan = document.getElementById('current-score')!;
const timeLeftSpan = document.getElementById('time-left')!;
const leaderboardContent = document.getElementById('leaderboard-content')!;
const testResults = document.getElementById('test-results')!;

// Initialize
document.getElementById('start-game')!.addEventListener('click', startGame);
document.getElementById('restart-game')!.addEventListener('click', restartGame);
document
  .getElementById('view-leaderboard')!
  .addEventListener('click', showLeaderboard);
document
  .getElementById('hide-leaderboard')!
  .addEventListener('click', hideLeaderboard);
document
  .getElementById('test-all-methods')!
  .addEventListener('click', testAllMethods);

function createGame(this: Phaser.Scene) {
  // Create a simple clickable target
  const graphics = this.add.graphics();
  graphics.fillStyle(0x50e3c2, 1);
  graphics.fillCircle(0, 0, 30);
  graphics.generateTexture('target', 60, 60);
  graphics.destroy();

  targetSprite = this.add.sprite(400, 300, 'target').setInteractive();

  // Add click handler
  targetSprite.on('pointerdown', () => {
    if (gameActive) {
      score++;
      currentScoreSpan.textContent = score.toString();

      // Move target to random position
      const x = Phaser.Math.Between(60, 740);
      const y = Phaser.Math.Between(60, 540);
      targetSprite!.setPosition(x, y);

      // Add pulse effect
      this.tweens.add({
        targets: targetSprite,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 100,
        yoyo: true,
      });
    }
  });

  // Add score text
  scoreText = this.add
    .text(400, 50, 'Click the target!', {
      fontSize: '32px',
      color: '#ffffff',
    })
    .setOrigin(0.5);
}

function updateGame() {
  // Game loop handled by timer
}

async function startGame() {
  const apiUrl = (
    document.getElementById('api-url') as HTMLInputElement
  ).value.trim();
  const apiKey = (
    document.getElementById('api-key') as HTMLInputElement
  ).value.trim();
  playerName = (
    document.getElementById('player-name') as HTMLInputElement
  ).value.trim();

  if (!apiUrl || !apiKey || !playerName) {
    showStatus(setupStatus, 'Please fill in all fields', 'error');
    return;
  }

  try {
    // Initialize SDK (v2 API)
    client = new KeeperBoardClient({ apiUrl, apiKey });
    identity = new PlayerIdentity();

    // Test connection
    await client.healthCheck();
    showStatus(setupStatus, 'Connected successfully!', 'success');

    // Hide setup, show game
    setupSection.style.display = 'none';
    gameSection.style.display = 'block';
    currentPlayerSpan.textContent = playerName;

    // Initialize Phaser game
    if (!game) {
      game = new Phaser.Game(config);
    }

    // Start gameplay
    startGameplay();
  } catch (error: any) {
    showStatus(setupStatus, `Error: ${error.message}`, 'error');
  }
}

function startGameplay() {
  score = 0;
  timeLeft = 30;
  gameActive = true;
  currentScoreSpan.textContent = '0';
  timeLeftSpan.textContent = '30';

  // Start timer
  timerInterval = window.setInterval(() => {
    timeLeft--;
    timeLeftSpan.textContent = timeLeft.toString();

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

async function endGame() {
  gameActive = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  showStatus(gameStatus, `Game Over! Final Score: ${score}`, 'success');

  // Submit score to KeeperBoard (v2 API with options object)
  if (client && identity) {
    try {
      const playerGuid = identity.getOrCreatePlayerGuid();
      const result = await client.submitScore({
        playerGuid,
        playerName,
        score,
      });

      if (result.isNewHighScore) {
        showStatus(
          gameStatus,
          `🎉 New high score! Rank: #${result.rank}`,
          'success',
        );
      } else {
        showStatus(
          gameStatus,
          `Score submitted! Rank: #${result.rank}`,
          'success',
        );
      }
    } catch (error: any) {
      showStatus(
        gameStatus,
        `Error submitting score: ${error.message}`,
        'error',
      );
    }
  }
}

function restartGame() {
  startGameplay();
}

async function showLeaderboard() {
  leaderboardSection.style.display = 'block';
  gameSection.style.display = 'none';

  if (!client) return;

  try {
    // v2 API: options object, camelCase response
    const result = await client.getLeaderboard({ limit: 10 });
    displayLeaderboard(result.entries);
  } catch (error: any) {
    leaderboardContent.innerHTML = `<p class="error">Error loading leaderboard: ${error.message}</p>`;
  }
}

function hideLeaderboard() {
  leaderboardSection.style.display = 'none';
  gameSection.style.display = 'block';
}

function displayLeaderboard(entries: LeaderboardEntry[]) {
  if (entries.length === 0) {
    leaderboardContent.innerHTML = '<p>No scores yet. Be the first!</p>';
    return;
  }

  // v2 API: camelCase fields (playerName instead of player_name)
  const html = entries
    .map(
      (entry) => `
    <div class="leaderboard-entry">
      <span class="rank">#${entry.rank}</span>
      <span class="player-name">${entry.playerName}</span>
      <span class="score">${entry.score}</span>
    </div>
  `,
    )
    .join('');

  leaderboardContent.innerHTML = html;
}

async function testAllMethods() {
  if (!client || !identity) {
    showStatus(testResults, 'Game not initialized', 'error');
    return;
  }

  const results: string[] = [];
  const playerGuid = identity.getOrCreatePlayerGuid();

  try {
    // Test 1: Health check
    results.push('✅ healthCheck()');
    await client.healthCheck();

    // Test 2: Submit score (v2 API)
    results.push('✅ submitScore()');
    const submitResult = await client.submitScore({
      playerGuid,
      playerName,
      score: 999,
    });
    results.push(
      `   → Rank: #${submitResult.rank}, New high: ${submitResult.isNewHighScore}`,
    );

    // Test 3: Get leaderboard (v2 API)
    results.push('✅ getLeaderboard()');
    const leaderboard = await client.getLeaderboard({ limit: 5 });
    results.push(`   → Found ${leaderboard.entries.length} entries`);

    // Test 4: Get player rank (v2 API - renamed from getPlayer)
    results.push('✅ getPlayerRank()');
    const player = await client.getPlayerRank({ playerGuid });
    if (player) {
      results.push(`   → Score: ${player.score}, Rank: #${player.rank}`);
    } else {
      results.push(`   → Player not found`);
    }

    // Test 5: Update player name (v2 API)
    results.push('✅ updatePlayerName()');
    const newName = `${playerName}_updated`;
    const updateResult = await client.updatePlayerName({
      playerGuid,
      newName,
    });
    results.push(`   → Updated to: ${updateResult.playerName}`);

    // Restore original name
    await client.updatePlayerName({ playerGuid, newName: playerName });

    // Test 6: Claim score (v2 API - will likely fail since we don't have migrated scores)
    results.push('⚠️ claimScore() - expecting failure (no migrated scores)');
    try {
      await client.claimScore({ playerGuid, playerName: 'NonexistentPlayer' });
      results.push('   → Unexpectedly succeeded');
    } catch (error: any) {
      results.push(`   → Expected failure: ${error.message}`);
    }

    showStatus(testResults, results.join('\n'), 'success');
  } catch (error: any) {
    results.push(`❌ Test failed: ${error.message}`);
    showStatus(testResults, results.join('\n'), 'error');
  }
}

function showStatus(
  element: HTMLElement,
  message: string,
  type: 'success' | 'error',
) {
  element.textContent = message;
  element.className = `status ${type}`;
  element.style.whiteSpace = 'pre-line';
}
