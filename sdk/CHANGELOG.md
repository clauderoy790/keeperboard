# Changelog

All notable changes to the KeeperBoard SDK are documented here.

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
