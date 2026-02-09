# KeeperBoard SDK

TypeScript client SDK for [KeeperBoard](https://github.com/clauderoy790/keeperboard) — a free, open-source leaderboard-as-a-service for indie game developers.

Works with Phaser.js, vanilla JavaScript, and any TypeScript/JavaScript game running in the browser.

## Installation

```bash
npm install keeperboard
```

### Alternative: Copy source directly

If you prefer not to use npm, copy the `src/` folder into your project:

```typescript
import { KeeperBoardClient, PlayerIdentity } from './keeperboard/index';
```

## Quick Start

### 1. Get your API key

1. Sign up at your KeeperBoard dashboard
2. Create a game
3. Create an environment (dev/prod)
4. Generate an API key for that environment

### 2. Initialize the client

```typescript
import { KeeperBoardClient, PlayerIdentity } from 'keeperboard';

// Create the API client
const client = new KeeperBoardClient({
  apiKey: 'kb_prod_your_api_key_here',
});

// Helper for persistent player identity
const identity = new PlayerIdentity();
```

### 3. Submit a score

```typescript
const playerGuid = identity.getOrCreatePlayerGuid();

// Submit to default leaderboard
const result = await client.submitScore(playerGuid, 'PlayerName', 1500);

console.log(`Rank: #${result.rank}`);
console.log(`New high score: ${result.is_new_high_score}`);
```

### 4. Display the leaderboard

```typescript
// Get top 10
const leaderboard = await client.getLeaderboard();

leaderboard.entries.forEach((entry) => {
  console.log(`#${entry.rank} ${entry.player_name}: ${entry.score}`);
});
```

### 5. Show player's rank (even if not in top 10)

```typescript
const player = await client.getPlayerRank(playerGuid);

if (player && player.rank > 10) {
  console.log(`You are ranked #${player.rank} with ${player.score} points`);
}
```

## API Reference

### KeeperBoardClient

#### Constructor

```typescript
const client = new KeeperBoardClient({
  apiKey: string, // API key from dashboard
});
```

> **Note:** The API key determines which game and environment you're accessing. You don't need to pass environment or game IDs — they're implicit in the key.

---

### Score Submission

#### `submitScore(playerGuid, playerName, score)`

Submit a score to the default leaderboard. Only updates if higher than existing score.

```typescript
const result = await client.submitScore('player-uuid', 'PlayerName', 2500);
// Returns: { id, player_guid, player_name, score, rank, is_new_high_score }
```

#### `submitScore(playerGuid, playerName, score, leaderboard)`

Submit to a specific leaderboard by name.

```typescript
await client.submitScore('player-uuid', 'PlayerName', 2500, 'Weekly Best');
```

#### `submitScore(playerGuid, playerName, score, leaderboard, metadata)`

Submit with optional metadata.

```typescript
await client.submitScore('player-uuid', 'PlayerName', 2500, 'Weekly Best', {
  level: 10,
  character: 'warrior',
});
```

---

### Leaderboard

#### `getLeaderboard()`

Get the default leaderboard (top 10 entries).

```typescript
const lb = await client.getLeaderboard();
// Returns: { entries, total_count, reset_schedule }
```

#### `getLeaderboard(name)`

Get a specific leaderboard by name.

```typescript
const lb = await client.getLeaderboard('Weekly Best');
```

#### `getLeaderboard(name, limit)`

Get with a custom limit (max 100).

```typescript
const lb = await client.getLeaderboard('Weekly Best', 50);
```

#### `getLeaderboard(name, limit, offset)`

Get with pagination.

```typescript
// Page 2 (entries 11-20)
const lb = await client.getLeaderboard('Weekly Best', 10, 10);
```

---

### Leaderboard Versions (Time-Based)

For leaderboards with reset schedules (daily/weekly/monthly), you can query historical versions.

#### `getLeaderboardVersion(name, version)`

Get a specific version of a time-based leaderboard.

```typescript
// Get last week's scores (version 3)
const lastWeek = await client.getLeaderboardVersion('Weekly Best', 3);
```

#### `getLeaderboardVersion(name, version, limit, offset)`

Get historical version with pagination.

```typescript
const lb = await client.getLeaderboardVersion('Weekly Best', 3, 25, 0);
```

---

### Player

#### `getPlayerRank(playerGuid)`

Get a player's rank and score. Returns `null` if player has no score.

```typescript
const player = await client.getPlayerRank('player-uuid');

if (player) {
  console.log(`Rank: #${player.rank}, Score: ${player.score}`);
}
```

#### `getPlayerRank(playerGuid, leaderboard)`

Get player's rank on a specific leaderboard.

```typescript
const player = await client.getPlayerRank('player-uuid', 'Weekly Best');
```

#### `updatePlayerName(playerGuid, newName)`

Update a player's display name.

```typescript
await client.updatePlayerName('player-uuid', 'NewPlayerName');
```

---

### Claim (for migrated scores)

#### `claimScore(playerGuid, playerName)`

Claim a migrated score by matching player name. Used when scores were imported without player GUIDs.

```typescript
const result = await client.claimScore('new-player-guid', 'ImportedPlayerName');
console.log(`Claimed score: ${result.score}, Rank: #${result.rank}`);
```

---

### Health Check

#### `healthCheck()`

Check if the API is healthy. Does not require an API key.

```typescript
const health = await client.healthCheck();
console.log(`API Version: ${health.version}`);
```

---

### PlayerIdentity

Helper for managing persistent player identity in localStorage.

```typescript
const identity = new PlayerIdentity({
  keyPrefix: 'mygame_', // optional, default: 'keeperboard_'
});

// Get or create a persistent player GUID
const guid = identity.getOrCreatePlayerGuid();

// Store/retrieve player name
identity.setPlayerName('PlayerName');
const name = identity.getPlayerName();

// Check if identity exists
if (identity.hasIdentity()) {
  // returning player
}

// Clear identity (e.g., for "Sign Out")
identity.clear();
```

---

### Error Handling

All methods throw `KeeperBoardError` on failure:

```typescript
import { KeeperBoardError } from 'keeperboard';

try {
  await client.submitScore(playerGuid, name, score);
} catch (error) {
  if (error instanceof KeeperBoardError) {
    console.error(`Error [${error.code}]: ${error.message}`);

    switch (error.code) {
      case 'INVALID_API_KEY':
        // Check your API key
        break;
      case 'NOT_FOUND':
        // Player or leaderboard not found
        break;
      case 'INVALID_REQUEST':
        // Check request parameters
        break;
    }
  }
}
```

---

## Multiple Leaderboards

If your game has multiple leaderboards (e.g., per-level or per-mode):

```typescript
// Submit to different leaderboards
await client.submitScore(guid, name, score, 'Level 1');
await client.submitScore(guid, name, score, 'Endless Mode');
await client.submitScore(guid, name, score, 'Weekly Challenge');

// Get specific leaderboards
const level1 = await client.getLeaderboard('Level 1');
const endless = await client.getLeaderboard('Endless Mode', 50);
```

---

## Phaser.js Integration Example

```typescript
import { KeeperBoardClient, PlayerIdentity } from 'keeperboard';

const client = new KeeperBoardClient({
  apiKey: 'kb_prod_your_api_key',
});

const identity = new PlayerIdentity();

class GameOverScene extends Phaser.Scene {
  private score: number = 0;

  init(data: { score: number }) {
    this.score = data.score;
  }

  async create() {
    const playerGuid = identity.getOrCreatePlayerGuid();
    const playerName = identity.getPlayerName() ?? 'Anonymous';

    // Submit score
    const result = await client.submitScore(playerGuid, playerName, this.score);

    // Display rank
    this.add
      .text(400, 200, `Your Rank: #${result.rank}`, { fontSize: '32px' })
      .setOrigin(0.5);

    if (result.is_new_high_score) {
      this.add
        .text(400, 250, 'NEW HIGH SCORE!', {
          fontSize: '24px',
          color: '#ffff00',
        })
        .setOrigin(0.5);
    }

    // Display top 10
    const leaderboard = await client.getLeaderboard();

    leaderboard.entries.forEach((entry, index) => {
      const isMe = entry.player_guid === playerGuid;
      const color = isMe ? '#00ff00' : '#ffffff';

      this.add
        .text(
          400,
          350 + index * 30,
          `#${entry.rank} ${entry.player_name}: ${entry.score}`,
          { fontSize: '18px', color },
        )
        .setOrigin(0.5);
    });

    // Show player's rank if not in top 10
    const player = await client.getPlayerRank(playerGuid);
    if (player && player.rank > 10) {
      this.add
        .text(400, 660, `... #${player.rank} ${playerName}: ${player.score}`, {
          fontSize: '18px',
          color: '#00ff00',
        })
        .setOrigin(0.5);
    }
  }
}
```

---

## Development

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Build
npm run build

# Run tests (requires .env with Supabase credentials)
npm test

# Clean
npm run clean
```

### Running Tests

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Then run:

```bash
npm test
```

---

## License

MIT
