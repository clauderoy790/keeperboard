# KeeperBoard SDK

TypeScript client SDK for [KeeperBoard](https://github.com/YOUR_USERNAME/keeperboard) — a free, open-source leaderboard-as-a-service for indie game developers.

Works with Phaser.js, vanilla JavaScript, and any TypeScript/JavaScript game running in the browser.

## Installation

```bash
npm install keeperboard-sdk
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
3. Generate an API key for your environment (dev/prod)

### 2. Initialize the client

```typescript
import { KeeperBoardClient, PlayerIdentity } from 'keeperboard-sdk';

// Create the API client
const keeperboard = new KeeperBoardClient({
  apiUrl: 'https://your-app.vercel.app',
  apiKey: 'kb_dev_your_api_key_here',
});

// Helper for persistent player identity
const playerIdentity = new PlayerIdentity();
```

### 3. Submit a score

```typescript
// Get or create a persistent player GUID
const playerGuid = playerIdentity.getOrCreatePlayerGuid();

// Submit a score (only updates if higher than existing)
const result = await keeperboard.submitScore(playerGuid, 'PlayerName', 1500);

console.log(`Rank: #${result.rank}`);
console.log(`New high score: ${result.is_new_high_score}`);
```

### 4. Display the leaderboard

```typescript
const leaderboard = await keeperboard.getLeaderboard(10);

leaderboard.entries.forEach((entry) => {
  console.log(`#${entry.rank} ${entry.player_name}: ${entry.score}`);
});
```

## API Reference

### KeeperBoardClient

#### Constructor

```typescript
const client = new KeeperBoardClient({
  apiUrl: string, // Your KeeperBoard API URL
  apiKey: string, // API key from dashboard (e.g., "kb_dev_...")
});
```

#### Methods

##### `submitScore(playerGuid, playerName, score, metadata?, leaderboardSlug?)`

Submit a score. Only updates if the new score is higher than the existing one.

```typescript
const result = await client.submitScore(
  'player-uuid-123',
  'PlayerName',
  2500,
  { level: 10, character: 'warrior' }, // optional metadata
  'high-scores', // optional leaderboard slug
);

// Returns:
// {
//   id: string,
//   player_guid: string,
//   player_name: string,
//   score: number,
//   rank: number,
//   is_new_high_score: boolean
// }
```

##### `getLeaderboard(limit?, offset?, leaderboardSlug?)`

Get leaderboard entries with pagination.

```typescript
const result = await client.getLeaderboard(
  25, // limit (max 100)
  0, // offset
  'high-scores', // optional leaderboard slug
);

// Returns:
// {
//   entries: [{ rank, player_guid, player_name, score }],
//   total_count: number
// }
```

##### `getPlayer(playerGuid, leaderboardSlug?)`

Get a player's score and rank. Returns `null` if not found.

```typescript
const player = await client.getPlayer('player-uuid-123');

if (player) {
  console.log(`Score: ${player.score}, Rank: #${player.rank}`);
}
```

##### `updatePlayerName(playerGuid, newName, leaderboardSlug?)`

Update a player's display name.

```typescript
const result = await client.updatePlayerName(
  'player-uuid-123',
  'NewPlayerName',
);
```

##### `claimScore(playerGuid, playerName, leaderboardSlug?)`

Claim a migrated score by matching player name. Used when scores were imported without player GUIDs.

```typescript
try {
  const result = await client.claimScore(
    'new-player-guid',
    'ImportedPlayerName',
  );
  console.log(`Claimed score: ${result.score}`);
} catch (error) {
  if (error.code === 'NOT_FOUND') {
    console.log('No unclaimed score found');
  }
}
```

##### `healthCheck()`

Check if the API is healthy. Does not require an API key.

```typescript
const health = await client.healthCheck();
console.log(`API Version: ${health.version}`);
```

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

### Error Handling

All methods throw `KeeperBoardError` on failure:

```typescript
import { KeeperBoardError } from 'keeperboard-sdk';

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
      case 'ALREADY_CLAIMED':
        // Player already has a score
        break;
    }
  }
}
```

## Phaser.js Integration Example

```typescript
import { KeeperBoardClient, PlayerIdentity } from 'keeperboard-sdk';

const keeperboard = new KeeperBoardClient({
  apiUrl: 'https://your-app.vercel.app',
  apiKey: 'kb_prod_your_api_key',
});

const playerIdentity = new PlayerIdentity();

class GameOverScene extends Phaser.Scene {
  private score: number = 0;

  init(data: { score: number }) {
    this.score = data.score;
  }

  async create() {
    const playerGuid = playerIdentity.getOrCreatePlayerGuid();
    const playerName = playerIdentity.getPlayerName() ?? 'Anonymous';

    // Submit score
    const result = await keeperboard.submitScore(
      playerGuid,
      playerName,
      this.score,
    );

    // Display result
    this.add
      .text(400, 200, `Your Rank: #${result.rank}`, {
        fontSize: '32px',
      })
      .setOrigin(0.5);

    if (result.is_new_high_score) {
      this.add
        .text(400, 250, 'NEW HIGH SCORE!', {
          fontSize: '24px',
          color: '#ffff00',
        })
        .setOrigin(0.5);
    }

    // Display leaderboard
    const leaderboard = await keeperboard.getLeaderboard(10);

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
  }
}
```

## Multiple Leaderboards

If your game has multiple leaderboards (e.g., per-level or per-mode), use the `leaderboardSlug` parameter:

```typescript
// Submit to a specific leaderboard
await client.submitScore(guid, name, score, undefined, 'level-1-scores');
await client.submitScore(guid, name, score, undefined, 'endless-mode');

// Get a specific leaderboard
const level1 = await client.getLeaderboard(10, 0, 'level-1-scores');
const endless = await client.getLeaderboard(10, 0, 'endless-mode');
```

## TypeScript Types

All types are exported for your convenience:

```typescript
import type {
  KeeperBoardConfig,
  ScoreSubmission,
  ScoreResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  PlayerResponse,
  ClaimResponse,
  HealthResponse,
} from 'keeperboard-sdk';
```

## Development

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Build
npm run build

# Clean
npm run clean
```

## License

MIT
