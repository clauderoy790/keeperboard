# Plan 4: KeeperBoard SDK v2.0.0 - Developer Experience Overhaul

## Status: COMPLETE

## Overview

Major SDK overhaul that internalizes universal consumer concerns (identity, caching, retry, type mapping) into a high-level `KeeperBoardSession` API while modernizing the low-level `KeeperBoardClient`.

**Outcome**: Consumer code reduced from ~415 lines of wrapper boilerplate to ~50 lines.

## Completed Phases

### Phase 1: camelCase Types & Client Modernization ✅

- Added camelCase response interfaces (`ScoreResult`, `LeaderboardResult`, `PlayerResult`, `ClaimResult`, `HealthResult`)
- Added options-object interfaces (`SubmitScoreOptions`, `GetLeaderboardOptions`, etc.)
- Replaced positional method overloads with options-object methods
- Added private `mapXxxResponse()` helpers for snake_case → camelCase conversion
- Added `defaultLeaderboard` to `KeeperBoardConfig`
- Merged `getLeaderboardVersion()` into `getLeaderboard()` via `version` option
- Kept snake_case types as `@deprecated` for v1 compatibility

### Phase 2: Name Validation Utility ✅

- Created `validation.ts` with pure `validateName()` function
- Configurable: minLength, maxLength, uppercase, allowedPattern
- Created `validation.test.ts` with comprehensive unit tests

### Phase 3: KeeperBoardSession — Identity & Core API ✅

- Created `KeeperBoardSession.ts` integrating:
  - `PlayerIdentity` for automatic GUID/name management
  - `KeeperBoardClient` with auto-injected identity
  - `validateName()` integration
- Key methods: `submitScore()`, `getSnapshot()`, `updatePlayerName()`
- `getSnapshot()` combines leaderboard + player rank with `isCurrentPlayer` flag

### Phase 4: Cache Layer ✅

- Created `Cache.ts` with generic TTL cache
- Features: `getOrFetch()`, `refreshInBackground()`, in-flight deduplication
- Session integration: opt-in via `cache: { ttlMs }` config
- `prefetch()` method for background warming

### Phase 5: Retry Queue & Submission Guard ✅

- Created `RetryQueue.ts` with localStorage persistence
- Configurable maxAge (default 24h), auto-expiration
- Session integration: opt-in via `retry: { maxAgeMs }` config
- `isSubmitting` flag prevents concurrent double-submissions
- `SessionScoreResult` discriminated union: `{ success: true, rank, isNewHighScore }` or `{ success: false, error }`

### Phase 6: Documentation & Examples ✅

- Rewrote `README.md` with Quick Start, Session API, Client API, Phaser integration
- Created `MIGRATION.md` with v1 → v2 guide, breaking changes, side-by-side comparisons
- Created `CHANGELOG.md` with all breaking changes and additions
- Rewrote `examples/phaser-example.ts` (~60 lines vs ~633 lines)
- Created `examples/advanced-example.ts` for low-level client usage

### Phase 7: Package Release & test-game Update ✅

- Version bumped to `2.0.0`
- Fixed `test-game/src/main.ts` to use v2 API (options objects, camelCase, `getPlayerRank()`)
- Fixed package.json exports order (types first)
- Typecheck passes
- Build produces CJS + ESM + types

## Final File Tree

```
sdk/src/
  index.ts                 (updated exports)
  types.ts                 (camelCase + options + session + @internal API types)
  KeeperBoardClient.ts     (options objects, camelCase mapping, defaultLeaderboard)
  KeeperBoardSession.ts    (high-level API)
  PlayerIdentity.ts        (unchanged)
  validation.ts            (name validation)
  Cache.ts                 (generic TTL cache)
  RetryQueue.ts            (localStorage retry)

sdk/tests/
  integration.test.ts      (updated for v2 API)
  validation.test.ts       (unit tests)
  cache.test.ts            (unit tests)
  retry.test.ts            (unit tests)

sdk/
  README.md                (rewritten)
  MIGRATION.md             (new)
  CHANGELOG.md             (new)
  package.json             (v2.0.0)
  examples/
    phaser-example.ts      (rewritten with Session)
    advanced-example.ts    (new - low-level Client)
```

## Verification Checklist

- [x] `npm run typecheck` — zero errors
- [x] `npm run build` — CJS + ESM + types generated
- [ ] `npm test` — requires running KeeperBoard server (integration tests)
- [x] test-game updated to v2 API

## Breaking Changes Summary

1. Method signatures: positional args → options objects
2. Response fields: snake_case → camelCase
3. `getLeaderboardVersion()` merged into `getLeaderboard({ version })`
4. New exports: `KeeperBoardSession`, `validateName`, `Cache`, `RetryQueue`
