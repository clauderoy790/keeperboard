# Migration Guide: v1 → v2

This guide helps you migrate from KeeperBoard SDK v1.x to v2.0.0.

## Overview

v2 introduces a **new high-level API** (`KeeperBoardSession`) that eliminates boilerplate for common use cases. The low-level `KeeperBoardClient` remains available but now uses **options objects** and **camelCase** responses.

## Quick Migration (Recommended)

Replace your wrapper code with `KeeperBoardSession`:

### Before (v1)

```typescript
// ~400 lines of LeaderboardManager wrapper code:
// - Manual identity management
// - Custom caching
// - Retry queue
// - Type mapping
// - Combined API calls

import { KeeperBoardClient, PlayerIdentity } from 'keeperboard';

class LeaderboardManager {
  private client: KeeperBoardClient;
  private identity: PlayerIdentity;
  private cache: CachedData | null = null;
  // ... 400 more lines
}
```

### After (v2)

```typescript
import { KeeperBoardSession } from 'keeperboard';

const session = new KeeperBoardSession({
  apiKey: 'kb_dev_xxx',
  leaderboard: 'main',
  cache: { ttlMs: 30000 },
  retry: { maxAgeMs: 86400000 },
});

// That's it. All the functionality is built in.
await session.submitScore(1500);
const snapshot = await session.getSnapshot();
```

## Breaking Changes

### 1. Method Signatures → Options Objects

**v1 (positional arguments):**
```typescript
client.submitScore(playerGuid, playerName, score, leaderboard, metadata);
client.getLeaderboard(name, limit, offset);
client.getPlayerRank(playerGuid, leaderboard);
```

**v2 (options objects):**
```typescript
client.submitScore({ playerGuid, playerName, score, leaderboard, metadata });
client.getLeaderboard({ leaderboard, limit, offset, version });
client.getPlayerRank({ playerGuid, leaderboard });
```

### 2. Response Fields → camelCase

**v1 (snake_case):**
```typescript
result.player_guid
result.player_name
result.is_new_high_score
result.total_count
result.reset_schedule
```

**v2 (camelCase):**
```typescript
result.playerGuid
result.playerName
result.isNewHighScore
result.totalCount
result.resetSchedule
```

### 3. getLeaderboardVersion() → getLeaderboard() with version

**v1:**
```typescript
client.getLeaderboardVersion('Weekly', 3);
```

**v2:**
```typescript
client.getLeaderboard({ leaderboard: 'Weekly', version: 3 });
```

### 4. Config: defaultLeaderboard

**v2 adds** `defaultLeaderboard` to `KeeperBoardConfig`:

```typescript
const client = new KeeperBoardClient({
  apiKey: 'kb_dev_xxx',
  defaultLeaderboard: 'main',  // NEW - used when leaderboard not specified
});

// Now you can omit leaderboard in calls:
client.submitScore({ playerGuid, playerName, score }); // Uses 'main'
```

## Type Changes

| v1 Type | v2 Type | Notes |
|---------|---------|-------|
| `ScoreResponse` | `ScoreResult` | camelCase fields |
| `LeaderboardResponse` | `LeaderboardResult` | camelCase fields |
| `PlayerResponse` | `PlayerResult` | camelCase fields |
| `ClaimResponse` | `ClaimResult` | camelCase fields |
| `HealthResponse` | `HealthResult` | Same shape |
| `LeaderboardEntry` | `LeaderboardEntry` | camelCase fields |
| — | `SubmitScoreOptions` | NEW |
| — | `GetLeaderboardOptions` | NEW |
| — | `GetPlayerRankOptions` | NEW |
| — | `UpdatePlayerNameOptions` | NEW |
| — | `ClaimScoreOptions` | NEW |
| — | `SessionConfig` | NEW |
| — | `SessionScoreResult` | NEW |
| — | `SnapshotEntry` | NEW |
| — | `SnapshotResult` | NEW |

### Deprecated Types

The old snake_case types are still exported but marked `@deprecated`:

```typescript
// These still work but show deprecation warnings:
import type { ScoreResponse, LeaderboardResponse } from 'keeperboard';
```

## New Exports

```typescript
// High-level API
import { KeeperBoardSession } from 'keeperboard';

// Utilities
import { validateName, Cache, RetryQueue } from 'keeperboard';

// Types
import type {
  SessionConfig,
  SessionScoreResult,
  SnapshotEntry,
  SnapshotResult,
  NameValidationOptions,
} from 'keeperboard';
```

## Method-by-Method Migration

### submitScore

```typescript
// v1
const result = await client.submitScore(
  playerGuid,
  playerName,
  score,
  'leaderboard',
  { level: 5 }
);
console.log(result.is_new_high_score);

// v2
const result = await client.submitScore({
  playerGuid,
  playerName,
  score,
  leaderboard: 'leaderboard',
  metadata: { level: 5 },
});
console.log(result.isNewHighScore);
```

### getLeaderboard

```typescript
// v1
const lb = await client.getLeaderboard('main', 25, 0);
lb.entries.forEach(e => console.log(e.player_name));
console.log(lb.total_count);

// v2
const lb = await client.getLeaderboard({ leaderboard: 'main', limit: 25, offset: 0 });
lb.entries.forEach(e => console.log(e.playerName));
console.log(lb.totalCount);
```

### getPlayerRank

```typescript
// v1
const player = await client.getPlayerRank(playerGuid, 'main');
if (player) console.log(player.player_name);

// v2
const player = await client.getPlayerRank({ playerGuid, leaderboard: 'main' });
if (player) console.log(player.playerName);
```

### updatePlayerName

```typescript
// v1
await client.updatePlayerName(playerGuid, 'NEW_NAME', 'main');

// v2
await client.updatePlayerName({ playerGuid, newName: 'NEW_NAME', leaderboard: 'main' });
```

### claimScore

```typescript
// v1
await client.claimScore(playerGuid, playerName, 'main');

// v2
await client.claimScore({ playerGuid, playerName, leaderboard: 'main' });
```

## Using KeeperBoardSession (New)

If you wrote a wrapper class like `LeaderboardManager`, you can likely delete it and use `KeeperBoardSession`:

```typescript
const session = new KeeperBoardSession({
  apiKey: import.meta.env.VITE_KEEPERBOARD_API_KEY,
  leaderboard: 'main',
  cache: { ttlMs: 30000 },
  retry: { maxAgeMs: 86400000 },
});

// Identity is automatic
session.getPlayerGuid();   // localStorage-backed
session.getPlayerName();
session.setPlayerName('ACE');

// Submit with auto-injected identity
const result = await session.submitScore(1500);
if (result.success) {
  console.log(result.rank, result.isNewHighScore);
} else {
  console.error(result.error); // Saved to retry queue if enabled
}

// Combined leaderboard + player rank
const snapshot = await session.getSnapshot({ limit: 10 });
snapshot.entries.forEach(e => {
  console.log(e.playerName, e.score, e.isCurrentPlayer ? '(you)' : '');
});

// Retry on startup
await session.retryPendingScore();

// Pre-fetch for instant display
session.prefetch();
```

## Need Help?

If you encounter issues migrating, please [open an issue](https://github.com/clauderoy790/keeperboard/issues).
