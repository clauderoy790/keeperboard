# Changelog

All notable changes to the KeeperBoard SDK are documented here.

## [2.3.0] - 2026-08-05

### Added

- **`platform` (required)** in `SessionConfig` and `KeeperBoardConfig` — identifies which build
  a score came from. `'web' | 'ios' | 'android' | 'windows' | 'macos' | 'linux'`, exported as the
  `Platform` type and the `PLATFORMS` array.
- **`gameVersion`** (optional) in both configs — enables retention-by-version in the dashboard.
- **Acquisition tracking** — the SDK captures a `?ref=` tag from the URL on a player's first
  visit, stores it alongside their GUID, and attaches it to every run afterwards. First-touch:
  never overwritten. Exposed via `session.getSource()` and the `captureSource` / `clearSource`
  helpers.
- `platform` is now sent on `submitScore()`, `startRun()` and `finishRun()`; `gameVersion` and
  `source` are sent on `startRun()`.

### Changed

- **Breaking:** `platform` is required. TypeScript builds fail until it is added:

  ```typescript
  const session = new KeeperBoardSession({
    apiKey: 'kb_...',
    leaderboard: 'main',
    platform: 'web',   // add this
  });
  ```

  Released as a minor because the SDK has a single known consumer, updated in the same change.
  Existing published versions keep working — the API treats an absent platform as `null`.

### Fixed

- Corrected `validateName()` documentation, which described uppercasing and space-stripping that
  the function does not do (`'  Ace Pilot! '` returns `'Ace Pilot'`, not `'ACEPILOT'`), and
  removed a documented `uppercase` option that does not exist.
- Fixed `phaser-example.ts` treating `updatePlayerName()`'s result as a boolean. Since
  `{ success: false }` is truthy, the example reported success on failure.

### Internal

- `npm run typecheck` now covers `tests/` and `examples/` via `tsconfig.test.json`. They were
  previously excluded, which is how the two documentation bugs above went unnoticed.
- Split test commands: `test:unit` (no database, <1s), `test:integration`, `test:clean`.

---

## [2.1.0] - 2026-03-07

### Added

- `ErrorCode` type for structured error handling: `'PROFANITY_DETECTED' | 'RATE_LIMITED' | 'INVALID_REQUEST' | 'NOT_FOUND' | 'INTERNAL_ERROR'`
- `errorCode` field in `SessionScoreResult` failure case
- `UpdateNameResult` type — `updatePlayerName()` now returns a result object instead of boolean

### Changed

- `KeeperBoardSession.updatePlayerName()` now returns `UpdateNameResult` instead of `boolean`
  - Success: `{ success: true }`
  - Failure: `{ success: false, error: string, errorCode?: ErrorCode }`
- Profanity errors (`PROFANITY_DETECTED`) are not added to the retry queue since they won't succeed on retry

---

## [2.0.0] - 2026-02-11

### Breaking Changes

- **Method signatures now use options objects** instead of positional arguments:
  ```typescript
  // Before
  client.submitScore(playerGuid, playerName, score, leaderboard);

  // After
  client.submitScore({ playerGuid, playerName, score, leaderboard });
  ```

- **All response types use camelCase** instead of snake_case:
  ```typescript
  // Before
  result.player_guid, result.is_new_high_score, lb.total_count

  // After
  result.playerGuid, result.isNewHighScore, lb.totalCount
  ```

- **`getLeaderboardVersion()` merged into `getLeaderboard()`** — use the `version` option:
  ```typescript
  // Before
  client.getLeaderboardVersion('Weekly', 3);

  // After
  client.getLeaderboard({ leaderboard: 'Weekly', version: 3 });
  ```

### Added

- **`KeeperBoardSession`** — High-level API for browser games with:
  - Automatic identity management (localStorage GUID + name)
  - Built-in TTL cache for `getSnapshot()`
  - Retry queue for failed score submissions
  - `getSnapshot()` combining leaderboard + player rank in one call
  - Double-submission prevention
  - Name validation integration

- **`validateName()`** — Pure function for name validation:
  - Configurable min/max length, case conversion, allowed characters
  - Returns sanitized string or null

- **`Cache<T>`** — Generic TTL cache with:
  - In-flight request deduplication
  - Background refresh support
  - `getOrFetch()`, `refreshInBackground()`, `invalidate()`

- **`RetryQueue`** — localStorage-based retry mechanism:
  - Configurable max age (default 24h)
  - Auto-expiration of old entries
  - `save()`, `get()`, `hasPending()`, `clear()`

- **`defaultLeaderboard` config option** — Set once, use everywhere:
  ```typescript
  const client = new KeeperBoardClient({
    apiKey: 'kb_dev_xxx',
    defaultLeaderboard: 'main',
  });
  // Now all calls default to 'main' leaderboard
  ```

- **New types**:
  - `SessionConfig`, `SessionScoreResult`, `SnapshotEntry`, `SnapshotResult`
  - `SubmitScoreOptions`, `GetLeaderboardOptions`, `GetPlayerRankOptions`
  - `UpdatePlayerNameOptions`, `ClaimScoreOptions`
  - `NameValidationOptions`
  - `ScoreResult`, `LeaderboardResult`, `PlayerResult`, `ClaimResult`, `HealthResult` (camelCase)

### Changed

- `KeeperBoardClient` methods now accept a single options object parameter
- All response interfaces renamed with `Result` suffix and use camelCase
- Internal API response types prefixed with `Api` (e.g., `ApiScoreResponse`)

### Deprecated

- Old snake_case types (`ScoreResponse`, `LeaderboardResponse`, etc.) — still exported but marked `@deprecated`

### Migration

See [MIGRATION.md](./MIGRATION.md) for a complete migration guide.

---

## [1.0.4] - 2025-01-XX

- Initial stable release
- `KeeperBoardClient` with positional argument methods
- `PlayerIdentity` localStorage helper
- Full TypeScript support

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/):
- **Major** (2.0.0): Breaking API changes
- **Minor** (2.1.0): New features, backward compatible
- **Patch** (2.0.1): Bug fixes, backward compatible
