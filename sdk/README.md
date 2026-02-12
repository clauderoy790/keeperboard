# KeeperBoard SDK

TypeScript client for [KeeperBoard](https://keeperboard.vercel.app) leaderboard-as-a-service. Works in browsers and Node.js.

## Installation

```bash
npm install keeperboard
```

## Quick Start (15 lines)

```typescript
import { KeeperBoardSession } from 'keeperboard';

const session = new KeeperBoardSession({
  apiKey: 'kb_dev_your_api_key',
  leaderboard: 'main',
  cache: { ttlMs: 30000 },  // Optional: 30s cache
  retry: { maxAgeMs: 86400000 },  // Optional: 24h retry queue
});

// Submit a score
const result = await session.submitScore(1500);
if (result.success) {
  console.log(`Rank #${result.rank}, New high: ${result.isNewHighScore}`);
}

// Get leaderboard with player's rank
const snapshot = await session.getSnapshot({ limit: 10 });
snapshot.entries.forEach(e => {
  console.log(`#${e.rank} ${e.playerName}: ${e.score}`, e.isCurrentPlayer ? '(you)' : '');
});
```

## Two API Layers

| Layer | Use case | Identity | Cache | Retry |
|-------|----------|----------|-------|-------|
| **KeeperBoardSession** | Browser games | Auto-managed | Built-in | Built-in |
| **KeeperBoardClient** | Server-side, advanced | Manual | No | No |

Most browser games should use `KeeperBoardSession`. Use `KeeperBoardClient` for server-side code or when you need full control.

---

## KeeperBoardSession API

### Constructor

```typescript
const session = new KeeperBoardSession({
  apiKey: 'kb_dev_xxx',           // Required
  leaderboard: 'main',            // Required - session is bound to one board
  defaultPlayerName: 'ANON',      // Optional (default: 'ANON')
  identity: { keyPrefix: 'app_' }, // Optional localStorage prefix
  cache: { ttlMs: 30000 },        // Optional TTL cache for getSnapshot()
  retry: { maxAgeMs: 86400000 },  // Optional retry queue for failed submissions
});
```

### Identity (auto-managed)

```typescript
session.getPlayerGuid();     // Get or create persistent GUID
session.getPlayerName();     // Get stored name or default
session.setPlayerName(name); // Store name locally (doesn't update server)

// Validate a name (pure function)
const validated = session.validateName('  Ace Pilot! ');
// Returns 'ACEPILOT' or null if invalid
```

### Core Methods

```typescript
// Submit score (identity auto-injected)
const result = await session.submitScore(1500, { level: 5 });
// Returns: { success: true, rank: 3, isNewHighScore: true }
//      or: { success: false, error: 'Network error' }

// Get snapshot (leaderboard + player rank combined)
const snapshot = await session.getSnapshot({ limit: 10 });
// Returns: {
//   entries: [{ rank, playerGuid, playerName, score, isCurrentPlayer }],
//   totalCount: 150,
//   playerRank: { rank: 42, score: 1200, ... } | null  // Only if outside top N
// }

// Update player name on server
const success = await session.updatePlayerName('MAVERICK');
```

### Retry Queue

```typescript
// Check for pending scores from previous failed submissions
if (session.hasPendingScore()) {
  await session.retryPendingScore();
}
```

### Cache

```typescript
// Pre-fetch in background (e.g., on menu load)
session.prefetch();

// getSnapshot() automatically uses cache when fresh
```

### Escape Hatch

```typescript
// Access underlying client for advanced operations
const client = session.getClient();
await client.claimScore({ playerGuid: '...', playerName: '...' });
```

---

## KeeperBoardClient API

Low-level client with options-object methods and camelCase responses.

### Constructor

```typescript
const client = new KeeperBoardClient({
  apiKey: 'kb_dev_xxx',
  defaultLeaderboard: 'main',  // Optional - used when leaderboard not specified
});
```

### Methods

```typescript
// Submit score
const result = await client.submitScore({
  playerGuid: 'abc-123',
  playerName: 'ACE',
  score: 1500,
  metadata: { level: 5 },      // Optional
  leaderboard: 'weekly',       // Optional - overrides defaultLeaderboard
});
// Returns: ScoreResult { id, playerGuid, playerName, score, rank, isNewHighScore }

// Get leaderboard
const lb = await client.getLeaderboard({
  leaderboard: 'main',  // Optional
  limit: 25,            // Optional (default 10, max 100)
  offset: 0,            // Optional pagination
  version: 3,           // Optional - for time-based boards
});
// Returns: LeaderboardResult { entries, totalCount, resetSchedule, version?, ... }

// Get player rank
const player = await client.getPlayerRank({
  playerGuid: 'abc-123',
  leaderboard: 'main',  // Optional
});
// Returns: PlayerResult | null

// Update player name
const updated = await client.updatePlayerName({
  playerGuid: 'abc-123',
  newName: 'MAVERICK',
  leaderboard: 'main',  // Optional
});

// Claim migrated score (for imported data without GUIDs)
const claim = await client.claimScore({
  playerGuid: 'abc-123',
  playerName: 'OldPlayer',
  leaderboard: 'main',  // Optional
});

// Health check (no auth required)
const health = await client.healthCheck();
```

---

## Name Validation

Standalone function for validating player names:

```typescript
import { validateName } from 'keeperboard';

validateName('  Ace Pilot! ');        // 'ACEPILOT'
validateName('x');                     // null (too short)
validateName('verylongname123456');   // 'VERYLONGNAME' (truncated to 12)

// Custom options
validateName('hello', {
  minLength: 3,
  maxLength: 8,
  uppercase: false,
  allowedPattern: /[^a-z]/g,
});
```

---

## Error Handling

```typescript
import { KeeperBoardError } from 'keeperboard';

try {
  await client.submitScore({ ... });
} catch (error) {
  if (error instanceof KeeperBoardError) {
    switch (error.code) {
      case 'INVALID_API_KEY':
        console.error('Check your API key');
        break;
      case 'NOT_FOUND':
        console.error('Leaderboard not found');
        break;
      case 'INVALID_REQUEST':
        console.error('Bad request:', error.message);
        break;
      default:
        console.error('API error:', error.message);
    }
  }
}
```

---

## Phaser.js Integration

```typescript
import { KeeperBoardSession } from 'keeperboard';

// Initialize once at game start
const leaderboard = new KeeperBoardSession({
  apiKey: import.meta.env.VITE_KEEPERBOARD_API_KEY,
  leaderboard: 'main',
  cache: { ttlMs: 30000 },
  retry: { maxAgeMs: 86400000 },
});

// In BootScene - prefetch and retry
class BootScene extends Phaser.Scene {
  async create() {
    leaderboard.prefetch();
    await leaderboard.retryPendingScore();
    this.scene.start('MenuScene');
  }
}

// In GameOverScene
class GameOverScene extends Phaser.Scene {
  async create() {
    const result = await leaderboard.submitScore(this.score);
    if (result.success) {
      this.showRank(result.rank, result.isNewHighScore);
    }

    const snapshot = await leaderboard.getSnapshot({ limit: 10 });
    this.displayLeaderboard(snapshot.entries);
  }
}
```

---

## Utilities

### PlayerIdentity

Standalone helper for localStorage identity management:

```typescript
import { PlayerIdentity } from 'keeperboard';

const identity = new PlayerIdentity({ keyPrefix: 'myapp_' });
const guid = identity.getOrCreatePlayerGuid();
identity.setPlayerName('ACE');
```

### Cache

Generic TTL cache with deduplication:

```typescript
import { Cache } from 'keeperboard';

const cache = new Cache<Data>(30000); // 30s TTL
const data = await cache.getOrFetch(() => fetchData());
```

### RetryQueue

localStorage-based retry for failed operations:

```typescript
import { RetryQueue } from 'keeperboard';

const queue = new RetryQueue('myapp_retry', 86400000); // 24h max age
queue.save(1500, { level: 5 });
const pending = queue.get(); // { score: 1500, metadata: {...} } or null
```

---

## Development

```bash
# Install dependencies
npm install

# Run tests (requires local KeeperBoard server + Supabase)
npm test

# Type check
npm run typecheck

# Build
npm run build
```

See [MIGRATION.md](./MIGRATION.md) for upgrading from v1.x.

## License

MIT
