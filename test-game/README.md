# KeeperBoard Test Game

A simple Phaser.js click-counter game to test the KeeperBoard SDK integration.

## Features

- **Simple Gameplay**: Click targets within 30 seconds to score points
- **SDK Integration**: Tests all KeeperBoard SDK methods
- **Leaderboard Display**: View top scores in real-time
- **Comprehensive Testing**: Button to test all SDK methods at once

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure KeeperBoard:**
   - Make sure the KeeperBoard app is running (default: http://localhost:3000)
   - Create a game in the dashboard
   - Create an environment (e.g., "dev")
   - Generate an API key for that environment
   - Create a leaderboard

3. **Run the test game:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3001

## How to Play

1. Enter your KeeperBoard API URL (e.g., `http://localhost:3000`)
2. Enter your API key (e.g., `kb_dev_...`)
3. Enter your player name
4. Click "Start Game"
5. Click the green targets as fast as you can within 30 seconds
6. Your score will be automatically submitted to KeeperBoard

## Testing SDK Methods

Click "Test All SDK Methods" on the leaderboard screen to run a comprehensive test of all SDK functionality:

- ✅ `healthCheck()` - Verify API connection
- ✅ `submitScore()` - Submit a test score
- ✅ `getLeaderboard()` - Fetch top entries
- ✅ `getPlayer()` - Get player stats
- ✅ `updatePlayerName()` - Change player name
- ⚠️ `claimScore()` - Attempt to claim migrated score (expected to fail if no migrated scores exist)

## SDK Integration Points

This test game demonstrates:

1. **Initialization:**

   ```typescript
   import { KeeperBoardClient, PlayerIdentity } from 'keeperboard';

   const client = new KeeperBoardClient({ apiUrl, apiKey });
   const identity = new PlayerIdentity();
   ```

2. **Player Identity:**

   ```typescript
   const playerGuid = identity.getOrCreatePlayerGuid();
   ```

3. **Score Submission:**

   ```typescript
   const result = await client.submitScore(playerGuid, playerName, score);
   console.log(`Rank: #${result.rank}, New high: ${result.is_new_high_score}`);
   ```

4. **Leaderboard Display:**

   ```typescript
   const { entries } = await client.getLeaderboard(10);
   entries.forEach((entry) => {
     console.log(`#${entry.rank} ${entry.player_name}: ${entry.score}`);
   });
   ```

5. **Player Lookup:**
   ```typescript
   const player = await client.getPlayer(playerGuid);
   console.log(`Your rank: #${player.rank}`);
   ```

## Tech Stack

- **Phaser 3** - Game framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **KeeperBoard SDK** - Leaderboard integration

## Production Notes

In a production game:

- Store the API URL in environment variables
- Use production API keys (kb*production*...)
- Add error handling and retry logic
- Consider caching leaderboard data
- Add loading states and better UX
