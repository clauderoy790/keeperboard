# Plan 24: Platform Tracking & Analytics

## Overview

Add a `platform` dimension to scores and runs, then build a game-level analytics dashboard on top of the
session data KeeperBoard already collects but never surfaces.

**Goal:** Answer "which platform should I market on, and does the traffic I acquire actually stick around?"
without standing up a separate analytics product.

**Repositories:**
- KeeperBoard (server + SDK): `/Users/claude/Git/keeperboard`
- Flight747 (game): `/Users/claude/Git/flight747`

**Approved UI:** Layout B — tabbed (Overview / Retention / Audience / Acquisition).
Mockup: https://claude.ai/code/artifact/c7bf4411-22cc-499b-961f-33a7e9633645

---

## Key Decisions

These were settled during design. Do not relitigate them mid-implementation.

| Decision | Choice | Why |
|---|---|---|
| Platform source | **Developer-supplied** via SDK config | The browser cannot distinguish the iOS app from Safari on iPhone. Only the developer knows which build they shipped. |
| Platform values | `web \| ios \| android \| windows \| macos \| linux` | Flattened, not `desktop`. Splitting later is impossible (can't backfill); collapsing later is a display-layer change. Maps 1:1 to Unity's `RuntimePlatform`. |
| Invalid platform | **400**, after `.toLowerCase()` | Dev-supplied field, so a bad value is a developer bug that surfaces on the first test submission. Loud beats silent. |
| Absent platform | **Accept, store `null`** | Required for the 536 existing scores and any client on SDK ≤ 2.2.2. Absent ≠ invalid. |
| `os` field | **Deferred** | No decision depends on Windows-vs-Mac today. Purely additive later — nullable column, optional SDK field. |
| Analytics table | **`game_runs`**, not `scores` | `scores` holds one row per player, written only on a personal best, and is pruned on version reset. `game_runs` is one row per session and survives resets. |
| Analytics scope | **Game + environment** | Dev testing must never pollute production MAU. Matches UGS environments / PlayFab titles. |
| Dedupe grain | `COUNT(DISTINCT player_guid)` at game+env | One GUID per install across all leaderboards (`PlayerIdentity` uses a single `${prefix}guid` key), so per-leaderboard scoping would double-count. |
| SDK version | **2.3.0** (minor) | `platform` is required in config, which is technically breaking, but flight747 is the only consumer and is updated in the same change. |
| `source` capture | **`?ref=` query param only** | `document.referrer` is stripped by Reddit's `rel="noreferrer"` and by in-app browsers. Tagged links are 100% reliable; the referrer fallback is all complexity and no certainty. |

---

## Current State

- `game_runs` has `started_at`, `finished_at`, `score`, `elapsed_seconds`, `used` — one row per `startRun()`,
  never pruned, but never read for anything except anti-cheat validation.
- `scores` has `metadata JSONB` (unused by flight747) and a nullable `run_id`.
- No `platform`, `country`, `game_version`, or `source` anywhere in the SDK or API.
- Dashboard has no analytics surface at all.

---

## Phase 1: Database Migration

**Goal:** Add every column now, even for charts built in later phases. Uncollected data is gone permanently.

### 1.1 Migration

**File:** `supabase/migrations/008_platform_analytics.sql`

```sql
-- Platform on scores (needed independently of game_runs: games without anti-cheat
-- POST straight to /v1/scores and never create a run, so there is nothing to join to)
ALTER TABLE scores ADD COLUMN platform TEXT;

-- Analytics dimensions on the session record
ALTER TABLE game_runs ADD COLUMN platform TEXT;
ALTER TABLE game_runs ADD COLUMN country TEXT;        -- ISO-3166 alpha-2, server-derived
ALTER TABLE game_runs ADD COLUMN game_version TEXT;
ALTER TABLE game_runs ADD COLUMN source TEXT;         -- first-touch ?ref= tag, web only

-- Constrain to the known set; NULL always allowed for backward compatibility
ALTER TABLE scores ADD CONSTRAINT scores_platform_check
  CHECK (platform IS NULL OR platform IN ('web','ios','android','windows','macos','linux'));
ALTER TABLE game_runs ADD CONSTRAINT game_runs_platform_check
  CHECK (platform IS NULL OR platform IN ('web','ios','android','windows','macos','linux'));

-- Indexes for the analytics queries
CREATE INDEX game_runs_started_at_idx ON game_runs(started_at);
CREATE INDEX game_runs_analytics_idx  ON game_runs(leaderboard_id, started_at, player_guid);
CREATE INDEX game_runs_platform_idx   ON game_runs(platform);
CREATE INDEX scores_platform_idx      ON scores(platform);

COMMENT ON COLUMN scores.platform IS
  'Build the score was submitted from. NULL for scores predating SDK 2.3.0.';
COMMENT ON COLUMN game_runs.source IS
  'First-touch ?ref= tag. Web only — app installs cannot carry attribution through the store.';
```

### 1.2 Regenerate types

```bash
cd keeperboard && npx supabase gen types typescript --project-id <id> > src/types/database.ts
```

**Test:** Migration applies cleanly. Existing 536 scores have `platform IS NULL`.
Inserting `platform = 'iPhone'` is rejected by the constraint.

---

## Phase 2: API — Accept & Validate

**Goal:** Both submission paths accept the new fields. Country is derived server-side.

### 2.1 Shared validation helper

**File:** `keeperboard/src/lib/api/platform.ts`

```ts
export const PLATFORMS = ['web','ios','android','windows','macos','linux'] as const;
export type Platform = (typeof PLATFORMS)[number];

/** Returns the normalized platform, or null if absent.
 *  Throws PlatformError when present-but-unrecognized (→ 400). */
export function normalizePlatform(raw: unknown): Platform | null { /* … */ }

/** Vercel geo header. Returns null locally, which is correct — no fake data. */
export function resolveCountry(request: Request): string | null {
  const c = request.headers.get('x-vercel-ip-country');
  return c && /^[A-Z]{2}$/.test(c) ? c : null;
}
```

### 2.2 Wire into routes

- `POST /api/v1/runs/start` — accept `platform`, `game_version`, `source`; derive `country`; store all
  four on the `game_runs` row at creation. **This is the primary collection point.**
- `POST /api/v1/runs/finish` — accept `platform`, write to `scores.platform`.
- `POST /api/v1/scores` — accept `platform`, write to `scores.platform` (non-anti-cheat path).

Error shape, matching existing conventions:

```
400 INVALID_PLATFORM
"Invalid platform \"iphone\". Expected one of: web, ios, android, windows, macos, linux"
```

**Test:** `scripts/test-anti-cheat.ts` style script covering: valid lowercase, valid uppercase (normalized),
absent (null, 200), invalid (400 with the message above), country populated on Vercel and null locally.

---

## Phase 3: SDK 2.3.0

**Goal:** Developers pass `platform`; the SDK handles `source` capture automatically.

### 3.1 Types

**File:** `sdk/src/types.ts` — add to both `KeeperBoardConfig` and `SessionConfig`:

```ts
/** Which build this is. Required — the SDK cannot infer it (an iOS app and
 *  Safari on iPhone are indistinguishable from inside the page). */
platform: Platform;
/** Optional build identifier, e.g. "1.4.2". Enables retention-by-version. */
gameVersion?: string;
```

Follow the existing string-union style (`ResetSchedule`, `ErrorCode`) — **not** a TS `enum`.

### 3.2 Source capture

**File:** `sdk/src/source.ts`

- On first init for a GUID, read `?ref=` from `location.search`.
- Persist to localStorage under `${keyPrefix}source` — **first-touch, never overwrite.**
- Sanitize: lowercase, strip to `[a-z0-9._-]`, cap at 64 chars.
- No `document.referrer` fallback. Absent → `null` → reported as "direct".

### 3.3 Plumb through

`KeeperBoardClient.startRun()` sends `platform`, `game_version`, `source`.
`submitScore()` / `finishRun()` send `platform`. `RetryQueue` must persist `platform` so
queued scores replay with the right value.

### 3.4 Docs & tests

- `sdk/README.md` — document `platform`, the accepted values, and the `?ref=` convention.
- `sdk/MIGRATION.md` — 2.2.x → 2.3.0: add `platform` to your config.
- `sdk/CHANGELOG.md` — new entry.
- Tests: platform in payload, source first-touch-never-overwritten, source sanitization,
  retry queue round-trip.

**Test:** `npm run test && npm run typecheck` in `sdk/`.

---

## Phase 4: Publish SDK 2.3.0

**Goal:** The new SDK is live on npm so flight747 can consume it. Follow `sdk/PUBLISHING.md`.

```bash
cd sdk
npm run test && npm run typecheck     # must pass before publishing
npm version minor                     # 2.2.2 → 2.3.0, commits package.json

cd .. && git tag v2.3.0               # npm version does NOT tag from a subdirectory
git push && git push --tags

cd sdk && npm publish                 # prepublishOnly runs the build automatically
```

**Verify:** `npm view keeperboard version` returns `2.3.0`.
Confirm `dist/` in the published tarball includes the obfuscated build (`NODE_ENV=production tsup`).

> **Blocker:** requires `npm login` as the package owner. If not logged in, run `npm login` first —
> this is interactive and must be done by the user, not the agent.

---

## Phase 5: Flight747 Integration

**Goal:** The game sends `platform` on every run. This is the whole point of the feature.

### 5.1 Upgrade the dependency

```bash
cd /Users/claude/Git/flight747
npm install keeperboard@2.3.0
```

### 5.2 Map Capacitor's platform to ours

**File:** `src/managers/LeaderboardManager.ts`

`Capacitor.getPlatform()` is typed `string` and can return values outside our union
(e.g. `'electron'`), so it must be mapped, not passed through:

```ts
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

Add to the existing `new KeeperBoardSession({...})` call (around line 89), alongside
`identity: { keyPrefix: 'flight747_' }`:

```ts
platform: resolvePlatform(),
gameVersion: __APP_VERSION__,   // from vite define, see 5.3
```

> The existing `keyPrefix: 'flight747_'` also scopes the new `flight747_source` key —
> no separate configuration needed.

### 5.3 Expose the app version

Add to `vite.config.js`:

```js
define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version) }
```

### 5.4 Verify against dev environment first

Play a run using the **dev** API key, then confirm in Supabase:

```sql
SELECT platform, country, game_version, source, started_at
FROM game_runs ORDER BY started_at DESC LIMIT 5;
```

Expect `platform = 'web'` in the browser. Test `?ref=test` and confirm `source = 'test'`
persists on a second visit *without* the param.

**Test:** browser → `web`; iOS simulator → `ios`; Android emulator → `android`.

---

## Phase 6: Analytics API

**Goal:** One endpoint per tab, scoped to game + environment.

**Files:** `keeperboard/src/app/api/games/[gameId]/analytics/{overview,retention,audience,acquisition}/route.ts`

All queries join `game_runs → leaderboards` to filter by `environment_id` (`leaderboards` is small;
no denormalization needed). Query params: `?environmentId=<uuid>&from=<iso>&to=<iso>`.

- **overview** — DAU/WAU/MAU, stickiness, plays/day series, new vs returning, platform split, engagement
  stats (median `elapsed_seconds`, abandon rate where `used = false`, runs per player), score histogram.
- **retention** — weekly cohorts by first-seen `player_guid`, D1/D7/D30, plus retention curve per platform.
- **audience** — hour × weekday heatmap, countries, `game_version` breakdown.
- **acquisition** — players and D7 by `source`.

> Retention cohorts are the expensive query. Start with a plain SQL CTE; only reach for a
> materialized rollup if it is actually slow at real data volume.

**Test:** Vitest against a seeded fixture. Assert dev-environment runs never appear in production totals —
this is the regression that matters most.

---

## Phase 7: Analytics Dashboard (Layout B)

**Goal:** Build the approved tabbed UI.

**Route:** `/dashboard/games/[gameId]/analytics`, linked from the game page.

- Environment dropdown reusing the existing `EnvironmentSwitcher` pattern, defaulting to the default env.
- Date range segmented control (7d / 30d / 90d / All).
- Four tabs: Overview / Retention / Audience / Acquisition.
- Charts as inline SVG built from data — no charting library, no CDN.
- Match the existing `Card` component exactly: 2px `cyan-500/20` border, 12px corner brackets,
  `cyan-400` uppercase `tracking-wider` labels, `font-mono`, `tabular-nums` on all figures.
- Empty states for `null` platform/source ("Unknown") — expect these to dominate initially.

**Test:** Compare against the mockup. Verify env switching changes the numbers, wide tables scroll
inside their own container, and keyboard focus is visible on tabs and controls.

---

## Phase 8: Scores Table Platform Column

**Goal:** The small UI piece from the original request.

**File:** `keeperboard/src/components/dashboard/ScoresTable.tsx`

Add a Platform column between TIME and DATE. Lowercase monospace chip with a per-platform accent
(`web` cyan, `ios` violet, `android` green, `null` → dim "unknown"). Header click filters by platform.
Hide on small screens like the existing `hidden md:table-cell` columns.

**Test:** Column renders, `null` shows "unknown" rather than blank, filter works, no horizontal page scroll.

---

## Phase 9: Store Releases

**Goal:** The updated SDK actually reaches real players on iOS and Android. **This is the goal of the
whole plan** — analytics with no app traffic in it proves nothing.

### 9.1 Pre-flight

- [ ] `npm run typecheck` clean in flight747
- [ ] Play a full run on web against **production** and confirm the `game_runs` row
- [ ] Confirm no console errors from the SDK upgrade

### 9.2 Version bumps

| Target | File | Change |
|---|---|---|
| Web/game | `package.json` | `0.1.0` → `0.2.0` |
| Android | `android/app/build.gradle` | `versionCode 6` → `7`, `versionName "1.1.5"` → `"1.1.6"` |
| iOS | Xcode → App target → General | `MARKETING_VERSION 1.0` → `1.1.0`, `CURRENT_PROJECT_VERSION 1` → `2` |

> **This is the first-ever iOS update.** iOS shipped once (build 1, Mar 2026) and has never been
> updated, which is why its version numbers sit behind Android's — not drift. Both live apps are on
> SDK 2.2.2 (published Mar 12, before the Mar 18 iOS build), so neither has a hidden version gap.
>
> Because it is the first update, budget extra time for App Store Connect: the listing may need
> refreshed screenshots and an updated "What's New" entry, and `docs/ios-release-checklist.md`
> section 4 (screenshots) is still unchecked.

### 9.3 Android

```bash
npm run cap:build:release          # build + cap sync + gradlew bundleRelease
```

Upload `android/app/build/outputs/bundle/release/app-release.aab` to the Play Console.
Test on the internal track first, confirm `platform = 'android'` rows appear, then promote to production.

### 9.4 iOS

```bash
npm run cap:sync
npm run cap:open:ios               # then Product → Archive in Xcode
```

Upload via Xcode Organizer to App Store Connect. Ship to TestFlight, confirm
`platform = 'ios'` rows appear, then submit for review.

Follow the existing `docs/ios-release-checklist.md` — screenshots (section 4) are still unchecked there
and are required for any new App Store submission.

> Both submissions require the user's store credentials and are interactive.
> The agent prepares the builds; the user performs the uploads and submissions.

### 9.5 Post-release verification

After both are live, confirm all three platforms are present in production:

```sql
SELECT platform, COUNT(*) AS runs, COUNT(DISTINCT player_guid) AS players
FROM game_runs r
JOIN leaderboards l ON l.id = r.leaderboard_id
WHERE l.environment_id = '<production-env-id>'
  AND r.started_at > NOW() - INTERVAL '7 days'
GROUP BY platform ORDER BY runs DESC;
```

---

## Phase 10: Acquisition Rollout

**Goal:** Start tagging links so the Acquisition tab has data.

- Add redirects on claudium.ai: `claudium.ai/flight747/<tag>` → `flight747.vercel.app/?ref=<tag>`
  (HTTPS only — an HTTP hop strips context and the tag is the only reliable signal anyway).
- Use a distinct tag per post: `reddit-webgames`, `reddit-incremental`, `twitter`, `itch-io`.
- Document the convention in flight747's README so tags stay consistent over time.

---

## What to Test at the End

1. **Platform correctness** — web/iOS/Android each produce the right value in production.
2. **Environment isolation** — dev runs never appear in production analytics. Highest-risk regression.
3. **Backward compatibility** — the 536 pre-existing scores still render, showing "unknown".
4. **Validation** — `platform: "iPhone"` returns 400; omitting it returns 200 with `null`.
5. **Source first-touch** — arrive via `?ref=a`, return via `?ref=b`, source stays `a`.
6. **Retention math** — hand-verify one cohort against a raw SQL count.
7. **Store builds** — both apps install from their store listing and submit runs with the right platform.

---

## Risks

| Risk | Mitigation |
|---|---|
| App review rejection delays validating iOS end-to-end | Verify via TestFlight first; don't block later phases on review |
| Retention cohort queries slow as `game_runs` grows | Indexes in Phase 1; add a rollup table only if measured slow |
| `game_runs` grows unbounded (no pruning exists) | Out of scope. **Note:** `scores.run_id` has no `ON DELETE` clause, so any future prune job must null it first or the delete errors |
| Analytics look empty at launch | Expected. Phase 1 starts collection immediately so later phases have history behind them |
