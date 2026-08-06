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
  platform: 'web',          // Required: which build this is
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
  platform: 'web',                // Required - which build this is
  gameVersion: '1.4.2',           // Optional - enables retention-by-version
  identity: { keyPrefix: 'app_' }, // Optional localStorage prefix
  cache: { ttlMs: 30000 },        // Optional TTL cache for getSnapshot()
  retry: { maxAgeMs: 86400000 },  // Optional retry queue for failed submissions
});
```

### Platform (required)

`platform` tells the dashboard which build a score came from, so you can compare traffic and
retention across web, iOS and Android.

```typescript
type Platform = 'web' | 'ios' | 'android' | 'windows' | 'macos' | 'linux';
```

It describes **the build you shipped, not the device it runs on.** A web build opened in
Safari on an iPhone is `'web'` — only your native iOS app is `'ios'`. That is the distinction
that tells you which store or channel a player came through.

The SDK cannot detect this for you. From inside the page, a native app's webview and a mobile
browser are indistinguishable, so you have to say which one you built.

**Map your framework's value — don't pass it straight through.** `Capacitor.getPlatform()`
and Electron's `process.platform` both return values outside the union:

```typescript
import { Capacitor } from '@capacitor/core';
import type { Platform } from 'keeperboard';

function resolvePlatform(): Platform {
  switch (Capacitor.getPlatform()) {
    case 'ios':     return 'ios';
    case 'android': return 'android';
    default:        return 'web';
  }
}
```

An unrecognized value is rejected with `400 INVALID_PLATFORM`, so a typo surfaces on your
first test submission rather than silently producing empty analytics.

### Acquisition tracking (`?ref=`)

Add a `?ref=` tag to links you post and the SDK records where each player came from:

```
https://yourgame.com/?ref=reddit-webgames
```

Captured on the player's **first** visit, stored alongside their GUID, and attached to every
run they play afterwards — including when they later return by typing the URL directly. It is
never overwritten, so a player stays credited to the link that originally brought them in.

```typescript
session.getSource();  // 'reddit-webgames' | null
```

Tags are lowercased and stripped to `[a-z0-9._-]`, so `Reddit WebGames!` and
`reddit-webgames` cannot fragment into separate rows.

Two limits worth knowing:

- **Only `?ref=` is used, not `document.referrer`.** Reddit marks user-submitted links
  `rel="noreferrer"`, Facebook routes through a redirector, and links opened from mobile apps
  usually drop the referrer — so precisely the traffic you most want to measure is what the
  referrer cannot see. Untagged arrivals are reported as "direct" rather than guessed at.
- **Web only.** An app launched from the App Store or Play Store has no URL to read. Those
  players report no source; the stores' own acquisition reports cover that side.

### Identity (auto-managed)

Player names are auto-generated on first access (e.g., `BOLDFALCON`, `SWIFTPANDA`). Players can override with `setPlayerName()`.

```typescript
session.getPlayerGuid();     // Get or create persistent GUID
session.getPlayerName();     // Get stored name (auto-generated if first time)
session.setPlayerName(name); // Store name locally (doesn't update server)
session.hasExplicitPlayerName(); // true if player chose their name

// Validate a name (pure function)
const validated = session.validateName('  Ace Pilot! ');
// Returns 'Ace Pilot' or null if invalid — case and single spaces are preserved,
// disallowed characters are stripped
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
  platform: 'web',             // Required - which build this is
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

validateName('  Ace Pilot! ');        // 'Ace Pilot' (trimmed, '!' stripped)
validateName('x');                     // null (too short)
validateName('verylongname123456');   // 'verylongname' (truncated to 12)

// Custom options. Case is always preserved — use `allowedPattern` to control
// which characters survive.
validateName('hello', {
  minLength: 3,
  maxLength: 8,
  allowedPattern: /[^a-z]/g,  // Strips anything that isn't a lowercase letter
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

## Anti-Cheat Protection

KeeperBoard provides optional anti-cheat measures to prevent casual leaderboard hacking:

### 1. HMAC Signing

When enabled, all requests are cryptographically signed to prevent tampering.

```typescript
const session = new KeeperBoardSession({
  apiKey: 'kb_prod_xxx',
  leaderboard: 'main',
  platform: 'web',
  signingSecret: process.env.KEEPERBOARD_SIGNING_SECRET, // From dashboard
});
```

**Setup:**
1. Enable "HMAC Signing" in KeeperBoard dashboard
2. Copy the signing secret
3. Add to your game's environment variables
4. Pass to SDK constructor

### 2. Run Tokens

For stronger protection, use run tokens to bind scores to game sessions:

```typescript
// When game starts
await session.startRun();

// ... player plays the game ...

// When game ends (instead of submitScore)
const result = await session.finishRun(score);
if (result.isNewHighScore) {
  console.log('New high score!');
}
```

**Server validates:**
- Run token exists and hasn't been used
- Minimum elapsed time passed (e.g., 5+ seconds)
- Score is within cap (if configured)
- Signature is valid (if signing enabled)

### 3. Build Obfuscation

For browser games, obfuscate your production build to make reverse-engineering harder:

```javascript
// vite.config.js
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';

export default {
  plugins: [
    obfuscatorPlugin({
      include: ['src/**/*.ts'],
      apply: 'build',
      options: {
        compact: true,
        controlFlowFlattening: true,
        stringArray: true,
        stringArrayEncoding: ['base64'],
      },
    }),
  ],
};
```

### Security Model

These measures stop **casual cheaters** (DevTools interception, simple replay attacks). Determined reverse-engineers with time and skill may still find ways around them. This is an acceptable tradeoff for most indie games.

---

## Phaser.js Integration

```typescript
import { KeeperBoardSession } from 'keeperboard';

// Initialize once at game start
const leaderboard = new KeeperBoardSession({
  apiKey: import.meta.env.VITE_KEEPERBOARD_API_KEY,
  leaderboard: 'main',
  platform: 'web',
  signingSecret: import.meta.env.VITE_KEEPERBOARD_SIGNING_SECRET, // Optional
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

// In GameScene - start run for anti-cheat
class GameScene extends Phaser.Scene {
  async create() {
    await leaderboard.startRun(); // Optional: enables run token validation
    // ... game logic ...
  }
}

// In GameOverScene - use finishRun if run was started
class GameOverScene extends Phaser.Scene {
  async create() {
    // finishRun() uses run token if active, falls back to submitScore()
    const result = await leaderboard.finishRun(this.score);
    if (result.isNewHighScore) {
      this.showRank(result.rank, result.isNewHighScore);
    }

    const snapshot = await leaderboard.getSnapshot({ limit: 10 });
    this.displayLeaderboard(snapshot.entries);
  }
}
```

---

## Utilities

### generatePlayerName

Generate random AdjectiveNoun player names:

```typescript
import { generatePlayerName } from 'keeperboard';

const name = generatePlayerName(); // 'BOLDFALCON', 'SWIFTPANDA', etc.
```

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

# Type check
npm run typecheck

# Build
npm run build
```

### Testing

Tests split into two kinds, distinguished by filename:

| Command | Runs | Needs | Speed |
|---------|------|-------|-------|
| `npm run test:unit` | `tests/*.test.ts` | Nothing | < 1s |
| `npm run test:integration` | `tests/*.integration.test.ts` | Supabase credentials | ~30s |
| `npm test` | Everything | Supabase credentials | ~30s |

**Unit tests** are pure logic — cache, retry queue, validation, name generation, session
behavior. No network, no database. Run these constantly while developing.

**Integration tests** exercise the real REST API against a real database. Each file creates
its own throwaway user, game, environment, leaderboard and API key with a random per-run
suffix, then deletes them in `afterAll` — which runs even when assertions fail, so a broken
test cannot leave rows behind. Every delete is keyed to an ID that run created; nothing
matches on name patterns, so existing data is never at risk.

The dev server starts automatically on port 3099 (or an already-running server is reused),
and is stopped on teardown. Credentials come from `sdk/.env`:

```bash
cp .env.example .env    # then fill in SUPABASE_URL and SUPABASE_SERVICE_KEY
npm run test:integration
```

Run a single file while iterating:

```bash
npx vitest run tests/platform.integration.test.ts
```

**If you already have `npm run dev` running**, point the tests at it instead of letting them
spawn a second server:

```bash
KEEPERBOARD_API_URL=http://localhost:3000 npm run test:integration
```

Two `next dev` processes on the same project contend over the `.next` directory, so the
spawned one never finishes building and the run fails with "Server did not start within 60s".
The harness skips spawning entirely when a server is already reachable at
`KEEPERBOARD_API_URL`.

> **Naming convention:** any test that touches the database or the API must be named
> `*.integration.test.ts`. That suffix is what keeps it out of `test:unit`, so a
> misnamed integration test will fail confusingly when run without credentials.

#### Orphaned fixtures

`afterAll` covers assertion failures, but not a process that dies before it runs — Ctrl-C,
a crashed dev server, a killed CI job. That leaves a throwaway game stranded in the database.

Every integration run therefore begins with a sweep that deletes fixtures left by *earlier*
runs, so an interrupted run heals itself next time instead of accumulating. Run it on its
own with:

```bash
npm run test:clean
```

The sweep only removes games whose name starts with a known fixture prefix
(`SDK Test Game `, `Anti-Cheat Test Game `, `Platform Test Game `) **and** that are more
than an hour old, so a concurrent run is never disturbed. Deletes are keyed to a resolved
game id, never to a name pattern.

**When adding a new integration suite,** add its game-name prefix to `FIXTURE_PREFIXES` in
`tests/sweepStaleFixtures.ts` — otherwise its orphans will not be collected.

See [MIGRATION.md](./MIGRATION.md) for upgrading from v1.x.

## License

MIT
