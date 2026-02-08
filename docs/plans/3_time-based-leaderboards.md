# Plan 3: Time-Based Leaderboards

**Feature:** Leaderboards with optional reset schedules (daily, weekly, monthly) following the Unity/PlayFab industry standard model.

**Core concept:** A leaderboard has ONE reset type (none/daily/weekly/monthly). Each reset increments a version number. Historical versions are archived and queryable. Existing leaderboards default to "none" (all-time) and work exactly as before.

---

## Phases

- [x] Phase 1: Database Migration (Schema Changes)
- [x] Phase 2: Version Resolution Logic (Lazy Reset Engine)
- [x] Phase 3: Public API Updates (Score Submission + Leaderboard Query)
- [x] Phase 4: Dashboard API Updates (CRUD + Scores Management)
- [x] Phase 5: Dashboard UI — Create/Edit Leaderboard Form
- [x] Phase 6: Dashboard UI — Leaderboard Detail Page (Version Navigation)
- [x] Phase 7: SDK Updates (TypeScript Client)
- [x] Phase 8: Archive Cleanup + Retention
- [x] Phase 9: Integration Testing & Polish

---

## Phase 1: Database Migration (Schema Changes)

**Goal:** Add reset schedule columns to `leaderboards` table and version column to `scores` table. Existing data remains unchanged and fully backward-compatible.

**File to create:** `keeperboard/supabase/migrations/002_time_based_leaderboards.sql`

### SQL Migration

```sql
-- Migration 002: Time-Based Leaderboards
-- Adds reset schedule support to leaderboards and version tracking to scores

-- ============================================
-- 1. ADD COLUMNS TO LEADERBOARDS TABLE
-- ============================================

-- Reset schedule: 'none' (default/all-time), 'daily', 'weekly', 'monthly'
ALTER TABLE leaderboards ADD COLUMN reset_schedule TEXT NOT NULL DEFAULT 'none'
  CHECK (reset_schedule IN ('none', 'daily', 'weekly', 'monthly'));

-- Reset time: hour (0-23) in UTC when the reset happens. Only used when reset_schedule != 'none'.
-- Defaults to 0 (midnight UTC).
ALTER TABLE leaderboards ADD COLUMN reset_hour INTEGER NOT NULL DEFAULT 0
  CHECK (reset_hour >= 0 AND reset_hour <= 23);

-- Current version number. Starts at 1. Incremented on each reset.
-- For 'none' leaderboards, stays at 1 forever.
ALTER TABLE leaderboards ADD COLUMN current_version INTEGER NOT NULL DEFAULT 1;

-- Timestamp when the current version/period started.
-- For 'none' leaderboards, this is the leaderboard creation time.
ALTER TABLE leaderboards ADD COLUMN current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============================================
-- 2. ADD VERSION COLUMN TO SCORES TABLE
-- ============================================

-- Version the score belongs to. Defaults to 1 for backward compat.
ALTER TABLE scores ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Update unique constraint: a player can have one score per leaderboard PER VERSION
-- Must drop old constraint first, then add new one
-- NOTE: Verify the actual constraint name before running. Check with:
--   SELECT constraint_name FROM information_schema.table_constraints
--   WHERE table_name = 'scores' AND constraint_type = 'UNIQUE';
-- The name below matches the Postgres default naming convention.
-- If the name differs, update the DROP CONSTRAINT line accordingly.
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'scores'
      AND constraint_name = 'scores_leaderboard_id_player_guid_key'
      AND constraint_type = 'UNIQUE'
  ) INTO constraint_exists;

  IF constraint_exists THEN
    ALTER TABLE scores DROP CONSTRAINT scores_leaderboard_id_player_guid_key;
  ELSE
    -- Try the alternative naming convention
    ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_leaderboard_id_player_guid_idx;
  END IF;
END $$;

ALTER TABLE scores ADD CONSTRAINT scores_leaderboard_id_player_guid_version_key
  UNIQUE(leaderboard_id, player_guid, version);

-- Index for querying scores by leaderboard + version (the most common query)
CREATE INDEX idx_scores_leaderboard_version ON scores(leaderboard_id, version);

-- Index for querying scores by leaderboard + version + score (for ranked queries)
CREATE INDEX idx_scores_leaderboard_version_score ON scores(leaderboard_id, version, score DESC);

-- ============================================
-- 3. SET current_period_start FOR EXISTING LEADERBOARDS
-- ============================================

-- Existing leaderboards get their created_at as period start
UPDATE leaderboards SET current_period_start = created_at;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Run this migration in your Supabase SQL Editor
-- 2. Regenerate TypeScript types: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

### Files to update after running migration

**`keeperboard/src/types/database.ts`** — Must be regenerated using:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > keeperboard/src/types/database.ts
```

If that's not possible (no CLI access), manually add these fields to the leaderboards and scores type definitions:

- `leaderboards.Row` / `Insert` / `Update`: add `reset_schedule`, `reset_hour`, `current_version`, `current_period_start`
- `scores.Row` / `Insert` / `Update`: add `version`

### What to test

1. Run migration in Supabase SQL Editor — should complete without errors
2. Existing leaderboards should all have `reset_schedule = 'none'`, `current_version = 1`, `reset_hour = 0`
3. Existing scores should all have `version = 1`
4. The unique constraint change works: can still only have one score per player per leaderboard per version
5. The app should continue working exactly as before (all existing functionality unchanged)

---

## Phase 2: Version Resolution Logic (Lazy Reset Engine)

**Goal:** Create a shared utility that determines the current version for a leaderboard, performing a "lazy reset" (incrementing the version) if the current period has elapsed. This is the core engine that all API routes will use.

**Why lazy reset:** No external cron jobs needed. The version advances the first time the leaderboard is accessed after a period ends. Simple, reliable, no infrastructure dependency.

### Files to create

**`keeperboard/src/lib/api/version.ts`** — Version resolution logic

```typescript
/**
 * Version resolution engine for time-based leaderboards.
 * Implements "lazy reset": checks if current period has elapsed and advances version if so.
 * For 'none' (all-time) leaderboards, always returns version 1 with no reset info.
 */
```

This file must export the following functions:

#### `resolveCurrentVersion(leaderboard)`

**Input:** A leaderboard object with fields: `id`, `reset_schedule`, `reset_hour`, `current_version`, `current_period_start`

**Return type:**
```typescript
interface VersionResolution {
  version: number;
  periodStart: string | null;  // null for 'none' leaderboards
  nextReset: string | null;    // null for 'none' leaderboards
}
```

**Logic:**
1. If `reset_schedule === 'none'`: return `{ version: 1, periodStart: null, nextReset: null }` immediately. No lazy reset needed.
2. Calculate `periodEnd` based on `reset_schedule` and `current_period_start`:
   - **daily:** `current_period_start` + 1 day, adjusted to `reset_hour` UTC
   - **weekly:** `current_period_start` + 7 days (week starts Monday), adjusted to `reset_hour` UTC
   - **monthly:** first day of next month, adjusted to `reset_hour` UTC
3. If `now < periodEnd`: current period is still active. Return `{ version: current_version, periodStart: current_period_start, nextReset: periodEnd }`
4. If `now >= periodEnd`: period has elapsed. Calculate how many periods have passed (could be multiple if nobody accessed for a while). Update the leaderboard row:
   - Increment `current_version` by the number of elapsed periods
   - Set `current_period_start` to the start of the current period
   - Use the Supabase admin client to update
   - Return the new version info

**Important edge cases:**
- Multiple periods may have elapsed (e.g., nobody played for 3 weeks on a weekly board). Must calculate correctly.
- Race condition: Two requests at reset time may both try to advance. Use the current `current_version` in the WHERE clause for optimistic locking: `UPDATE ... WHERE id = X AND current_version = old_version`. If 0 rows updated, re-read the leaderboard and use the new version.

#### `calculatePeriodStart(resetSchedule, resetHour, referenceDate)`

**Input:** reset type, reset hour, and a reference date

**Returns:** The start timestamp of the period that `referenceDate` falls within.

- **daily:** same day at `resetHour:00:00` UTC. If referenceDate is before resetHour, use previous day at resetHour.
- **weekly:** Monday of that week at `resetHour:00:00` UTC. Week boundary: Monday resetHour to next Monday resetHour. If referenceDate is Monday but before resetHour, it belongs to the PREVIOUS week. Use `getUTCDay()` where Monday=1. Example: if resetHour=0, then Monday 00:00:00 UTC is the start of the new week. If resetHour=14, then Monday 14:00:00 UTC is the start.
- **monthly:** first day of that month at `resetHour:00:00` UTC. If referenceDate is the 1st but before resetHour, it belongs to the PREVIOUS month.

**Boundary rule (applies to all types):** The period starts AT `resetHour:00:00.000` UTC. A timestamp exactly equal to the boundary belongs to the NEW period.

#### `calculateNextReset(resetSchedule, resetHour, periodStart)`

**Input:** reset type, reset hour, and the current period start

**Returns:** The timestamp when this period ends (= next period start)

- **daily:** periodStart + 1 day
- **weekly:** periodStart + 7 days
- **monthly:** first day of next month at resetHour UTC

#### `calculatePeriodStartForVersion(leaderboard, targetVersion)`

**Input:** A leaderboard object and a target version number

**Returns:** The `periodStart` timestamp for that version. Uses math based on `reset_schedule`, `reset_hour`, `current_version`, and `current_period_start` to calculate backwards.

- **daily:** `current_period_start - (current_version - targetVersion) days`
- **weekly:** `current_period_start - (current_version - targetVersion) * 7 days`
- **monthly:** subtract `(current_version - targetVersion)` months from current_period_start

### What to test

1. Write manual test cases for each reset type (daily/weekly/monthly)
2. Test edge case: leaderboard hasn't been accessed in 5 periods — should advance by 5
3. Test `none` leaderboards — should always return version 1, no updates
4. Test `calculatePeriodStart` at boundary times (exactly at reset hour, 1 second before, 1 second after)
5. Test monthly edge cases (Jan 31 → Feb has fewer days)

---

## Phase 3: Public API Updates (Score Submission + Leaderboard Query)

**Goal:** Update the public API (`/api/v1/scores` and `/api/v1/leaderboard`) to be version-aware. Score submissions go to the current version. Leaderboard queries return the current version by default, or a specific version if requested.

### Files to modify

#### 1. `keeperboard/src/lib/api/leaderboard.ts`

Update `resolveLeaderboard` to also return the full leaderboard object (including reset fields). Change the `select` to include: `id, sort_order, reset_schedule, reset_hour, current_version, current_period_start`.

Update `LeaderboardResolveResult` interface to include:
```typescript
export interface LeaderboardResolveResult {
  leaderboardId: string;
  sortOrder: 'asc' | 'desc';
  resetSchedule: 'none' | 'daily' | 'weekly' | 'monthly';
  resetHour: number;
  currentVersion: number;
  currentPeriodStart: string; // always a string from DB; for 'none' boards this is just created_at
}
```

#### 2. `keeperboard/src/app/api/v1/scores/route.ts`

**Changes to POST handler:**
1. After resolving leaderboard, call `resolveCurrentVersion()` from Phase 2 to get the active version
2. When checking for existing score, add `.eq('version', currentVersion)` to the query
3. When inserting new score, include `version: currentVersion`
4. When calculating rank, add `.eq('version', currentVersion)` to count only current version scores

**No changes to the response shape.** Score submission response stays the same (id, player_guid, player_name, score, rank, is_new_high_score).

#### 3. `keeperboard/src/app/api/v1/leaderboard/route.ts`

**Changes to GET handler:**
1. Accept new optional query param: `version` (integer)
2. After resolving leaderboard, call `resolveCurrentVersion()` to get current version info
3. If `version` param provided: validate it's between `oldestVersion` and `currentVersion`, use that version
4. If no `version` param: use current version
5. Add `.eq('version', targetVersion)` to score queries (both count and data)
6. For `none` leaderboards: always use version 1, don't include version fields in response

**Updated response shape:**

For `reset_schedule = 'none'`:
```json
{
  "entries": [...],
  "total_count": 42,
  "reset_schedule": "none"
}
```

For `reset_schedule != 'none'`:
```json
{
  "entries": [...],
  "total_count": 42,
  "reset_schedule": "weekly",
  "version": 6,
  "oldest_version": 1,
  "next_reset": "2026-02-16T00:00:00Z"
}
```

**Note on `next_reset`:** This always refers to the next reset of the CURRENT period, regardless of which version is being queried. If viewing historical version 3 while current is version 6, `next_reset` is still about when version 6 ends. This is because the client needs to know when the active leaderboard will reset, not historical info. The `version` field tells the client which version's data they're looking at.

**Calculating `oldest_version`:** Query `SELECT MIN(version) FROM scores WHERE leaderboard_id = X`. If no scores exist for older versions (they were cleaned up), this naturally gives the oldest available. **If no scores exist at all** (MIN returns null), default `oldest_version` to `current_version` (since there are no historical versions to browse).

#### 4. `keeperboard/src/app/api/v1/player/[guid]/route.ts`

**Changes to GET handler:**
- After resolving leaderboard, resolve current version
- Add `.eq('version', currentVersion)` to score lookup and rank calculation
- Player lookup returns their score in the current version (not all-time if it's a resetting board)

**Changes to PUT handler (name update):**
- Add `.eq('version', currentVersion)` to find the player's current score to update

#### 5. `keeperboard/src/app/api/v1/claim/route.ts`

**Changes to POST handler:**
- After resolving leaderboard, resolve current version
- Claimed scores should be assigned to current version
- Add `.eq('version', currentVersion)` to relevant queries

### What to test

1. **Score submission on 'none' leaderboard:** Works exactly as before, no version field visible
2. **Score submission on 'weekly' leaderboard:** Score gets `version = current_version`
3. **GET leaderboard with no version param:** Returns current version scores + version metadata
4. **GET leaderboard with `?version=3`:** Returns historical version scores
5. **GET leaderboard with invalid version (too high/low):** Returns appropriate error
6. **GET leaderboard for 'none' board:** Returns `reset_schedule: "none"`, no version/reset fields
7. **Player lookup on versioned board:** Returns score from current version
8. **Backward compatibility:** All existing API calls work without any changes

---

## Phase 4: Dashboard API Updates (CRUD + Scores Management)

**Goal:** Update the dashboard management APIs to handle the new reset fields when creating/editing leaderboards and to be version-aware when listing scores.

### Files to modify

#### 1. `keeperboard/src/app/api/games/[gameId]/leaderboards/route.ts`

**POST handler (create leaderboard):**
- Accept new optional fields in request body: `reset_schedule` (default: `'none'`), `reset_hour` (default: `0`)
- Validate `reset_schedule` is one of: `'none'`, `'daily'`, `'weekly'`, `'monthly'`
- Validate `reset_hour` is integer 0-23
- When inserting, include `reset_schedule`, `reset_hour`, `current_version: 1`
- For `current_period_start`: if `reset_schedule !== 'none'`, calculate the aligned period start using `calculatePeriodStart(reset_schedule, reset_hour, new Date())` from `version.ts`. This ensures the first period starts at a proper boundary (e.g., midnight UTC for daily, Monday for weekly, 1st of month for monthly). For `reset_schedule === 'none'`, use `new Date().toISOString()`.
- Return the new fields in the response

**GET handler (list leaderboards):**
- Update select to include: `reset_schedule`, `reset_hour`, `current_version`, `current_period_start`
- Return these fields in each leaderboard object

#### 2. `keeperboard/src/app/api/games/[gameId]/leaderboards/[leaderboardId]/route.ts`

**GET handler:**
- Include `reset_schedule`, `reset_hour`, `current_version`, `current_period_start` in select and response

**PUT handler (update leaderboard):**
- Allow updating `reset_hour` (takes effect at next reset)
- **`reset_schedule` is immutable after creation.** If the request body includes `reset_schedule` and it differs from the current value, return a 400 error: `"Cannot change reset schedule after creation. Create a new leaderboard instead."` This avoids complex edge cases with version recalculation and confusing score/version gaps.
- If `reset_schedule` is included but matches the current value, silently ignore it (no error)
- Update validation to handle `reset_hour` (0-23, only if schedule !== 'none')

**DELETE handler:** No changes needed (cascade delete handles scores with versions).

#### 3. `keeperboard/src/app/api/games/[gameId]/leaderboards/[leaderboardId]/scores/route.ts`

**GET handler (list scores for dashboard):**
- Accept new optional query param: `version` (integer)
- If leaderboard has `reset_schedule !== 'none'`:
  - Call `resolveCurrentVersion()` to ensure version is up to date
  - Default to current version if no `version` param
  - Add `.eq('version', targetVersion)` to score queries
- If `reset_schedule === 'none'`: ignore version param, query as before (all scores are version 1)
- Include version info in response metadata

**DELETE handler (clear all scores):**
- If leaderboard has a reset schedule, only clear scores for the current version (not all historical versions)
- Or offer a param `?all_versions=true` to clear everything

#### 4. `keeperboard/src/app/api/games/[gameId]/leaderboards/[leaderboardId]/scores/[scoreId]/route.ts`

- No changes strictly needed (operates on individual score by ID)
- Score ID is already unique across versions

#### 5. `keeperboard/src/app/api/games/[gameId]/leaderboards/[leaderboardId]/import/route.ts`

- When importing scores, assign them to current version
- After resolving leaderboard, call `resolveCurrentVersion()` and pass `version` to inserts

### What to test

1. **Create leaderboard with reset_schedule:** POST with `reset_schedule: "daily"` → returns leaderboard with schedule fields
2. **Create leaderboard without reset_schedule:** POST without it → defaults to `"none"`, `reset_hour: 0`
3. **Get leaderboard details:** Returns schedule fields
4. **List scores with version filter:** Only returns scores from specified version
5. **Import scores:** Imported scores get current version
6. **Reset/clear scores:** Only affects current version (or all if param specified)

---

## Phase 5: Dashboard UI — Create/Edit Leaderboard Form

**Goal:** Add reset schedule and reset time fields to the leaderboard creation and edit forms. Make it very clear that "No Reset (All-Time)" is the default.

### Files to modify

#### 1. `keeperboard/src/components/forms/LeaderboardForm.tsx`

**Add to form state:**
- `resetSchedule`: `'none' | 'daily' | 'weekly' | 'monthly'` — default `'none'`
- `resetHour`: `number` — default `0`

**Add to `LeaderboardFormProps.initialData` and `onSubmit` data:**
```typescript
interface LeaderboardFormData {
  name: string;
  slug: string;
  sort_order: 'asc' | 'desc';
  reset_schedule: 'none' | 'daily' | 'weekly' | 'monthly';
  reset_hour: number;
}
```

**UI additions (after Sort Order field):**

1. **Reset Schedule dropdown:**
   - Label: `"RESET SCHEDULE"`
   - Options:
     - `none`: `"No Reset (All-Time)"` — **this must be first/default, with clear labeling**
     - `daily`: `"Daily"`
     - `weekly`: `"Weekly"`
     - `monthly`: `"Monthly"`
   - Helper text: `"How often this leaderboard resets. 'No Reset' keeps all scores permanently."`
   - Style: Same as Sort Order dropdown (matching cyan corner brackets, font-mono, etc.)

2. **Reset Time field** (conditionally shown):
   - Only visible when `resetSchedule !== 'none'`
   - Label: `"RESET TIME (UTC)"`
   - Type: Select dropdown with hours 0-23, formatted as: `"00:00 UTC"`, `"01:00 UTC"`, ..., `"23:00 UTC"`
   - Default: `"00:00 UTC"` (value: 0)
   - Helper text: `"The hour (in UTC) when the leaderboard resets."`
   - Style: Same dropdown style as other selects

**For editing existing leaderboards:**
- `reset_schedule` select should always be disabled (immutable after creation) with helper text: `"Reset schedule cannot be changed after creation"`
- `reset_hour` can be changed if `reset_schedule !== 'none'` (takes effect at next reset)
- If `reset_schedule === 'none'`, hide the reset_hour field entirely (not relevant)

### What to test

1. **Create form shows new fields:** Reset Schedule dropdown visible, defaults to "No Reset (All-Time)"
2. **Reset Time only shown when schedule is not 'none':** Select "Daily" → reset time appears. Select "No Reset" → reset time disappears
3. **Create leaderboard with schedule:** Select "Weekly", submit → leaderboard created with `reset_schedule: "weekly"`
4. **Edit form loads existing data:** Editing a weekly leaderboard shows "Weekly" selected and correct reset hour
5. **Backward compat:** Editing an old "none" leaderboard still works, schedule shows "No Reset"

---

## Phase 6: Dashboard UI — Leaderboard Detail Page (Version Navigation)

**Goal:** Update the leaderboard detail page to show reset schedule info and allow browsing through historical versions.

### Files to modify

#### 1. `keeperboard/src/app/(dashboard)/dashboard/games/[gameId]/leaderboards/[leaderboardId]/page.tsx`

**Update the `Leaderboard` interface** to include new fields:
```typescript
interface Leaderboard {
  // ... existing fields ...
  reset_schedule: 'none' | 'daily' | 'weekly' | 'monthly';
  reset_hour: number;
  current_version: number;
  current_period_start: string;
}
```

**Add to Leaderboard Settings card** (after "Created" field):

1. **Reset Schedule display:**
   - Label: `"RESET SCHEDULE"`
   - Value: Human-readable — `"No Reset (All-Time)"`, `"Daily"`, `"Weekly"`, `"Monthly"`

2. **Reset Time display** (only if schedule !== 'none'):
   - Label: `"RESET TIME"`
   - Value: e.g., `"00:00 UTC"`, `"14:00 UTC"`

3. **Current Version display** (only if schedule !== 'none'):
   - Label: `"CURRENT VERSION"`
   - Value: e.g., `"Version 6"` or `"#6"`

4. **Next Reset countdown** (only if schedule !== 'none'):
   - Label: `"NEXT RESET"`
   - Value: Human-readable countdown, e.g., `"in 14h 23m"` or the exact date/time
   - Calculate client-side from `current_period_start`, `reset_schedule`, and `reset_hour`

**Add version navigation** above the Scores section (only if schedule !== 'none'):

Create a simple navigation bar:
```
[ ← Previous ] Version 6 (Feb 3 - Feb 9, 2026) [ Next → ]
```

- "Previous" button: disabled if viewing oldest version
- "Next" button: disabled if viewing current (latest) version
- Version label shows version number and calculated date range
- Changing version re-fetches scores with `?version=N`

**Add state:**
- `selectedVersion`: number | null (null = current)
- `oldestVersion`: number (from first score query or default 1)

**Score table behavior:**
- Pass `version` to `ScoresTable` component (or add as URL param to the scores API call)
- When viewing historical version: hide "Import Scores" and "Reset Leaderboard" buttons (read-only)

#### 2. `keeperboard/src/components/dashboard/ScoresTable.tsx`

**Add optional `version` prop:**
```typescript
interface ScoresTableProps {
  gameId: string;
  leaderboardId: string;
  version?: number;  // NEW: optional version filter
  onScoreCountChange?: (count: number) => void;
}
```

- When `version` is provided, append `?version=N` to the scores API call
- When viewing a historical version, disable score editing/deleting (scores are read-only)

### What to test

1. **'none' leaderboard:** No version info shown, no navigation bar, everything looks like before
2. **Reset leaderboard settings:** Shows reset schedule, reset time, current version, next reset countdown
3. **Version navigation:** Previous/Next buttons work, scores update for each version
4. **Historical version is read-only:** No edit/delete/import/reset buttons when viewing old version
5. **Edge case:** Leaderboard with only 1 version — Previous button disabled
6. **Countdown updates:** Next reset time is accurate based on schedule + reset hour

---

## Phase 7: SDK Updates (TypeScript Client)

**Goal:** Update the KeeperBoard TypeScript SDK to support version-based queries and include reset metadata in responses.

### Files to modify

#### 1. `sdk/src/types.ts`

**Add new types:**
```typescript
/** Reset schedule options for leaderboards */
export type ResetSchedule = 'none' | 'daily' | 'weekly' | 'monthly';

/** Version metadata included in responses for resetting leaderboards */
export interface VersionInfo {
  /** Current active version number */
  version: number;
  /** Oldest available version number */
  oldest_version: number;
  /** ISO timestamp of when the next reset occurs */
  next_reset: string;
}
```

**Update `LeaderboardResponse`:**
```typescript
export interface LeaderboardResponse {
  /** Array of leaderboard entries */
  entries: LeaderboardEntry[];
  /** Total number of scores in this version/period */
  total_count: number;
  /** The reset schedule of this leaderboard */
  reset_schedule: ResetSchedule;
  /** Version info — only present when reset_schedule is not 'none' */
  version?: number;
  oldest_version?: number;
  next_reset?: string;
}
```

**Add options interface:**
```typescript
/** Options for getLeaderboard() */
export interface GetLeaderboardOptions {
  /** Max entries to return (default: 10, max: 100) */
  limit?: number;
  /** Pagination offset (default: 0) */
  offset?: number;
  /** Leaderboard slug (uses default if not specified) */
  leaderboardSlug?: string;
  /** Specific version to query (omit for current version) */
  version?: number;
}
```

#### 2. `sdk/src/KeeperBoardClient.ts`

**Update `getLeaderboard` method signature:**

Change from:
```typescript
async getLeaderboard(limit?: number, offset?: number, leaderboardSlug?: string)
```

To:
```typescript
async getLeaderboard(options?: GetLeaderboardOptions)
```

**Keep backward compatibility** by also accepting the old positional arguments:
```typescript
async getLeaderboard(
  optionsOrLimit?: GetLeaderboardOptions | number,
  offset?: number,
  leaderboardSlug?: string
): Promise<LeaderboardResponse>
```

Implementation:
- If first arg is a number, treat as old-style call: `getLeaderboard(10, 0, 'my-board')`
- If first arg is an object, treat as new-style: `getLeaderboard({ limit: 10, version: 3 })`
- Build query params including `version` if provided

**Update `getPlayer` method:**
- No signature change needed. Player lookup automatically uses current version server-side.

**Update `submitScore` method:**
- No changes needed. Server automatically assigns current version.

#### 3. `sdk/src/index.ts`

- Export new types: `ResetSchedule`, `VersionInfo`, `GetLeaderboardOptions`

### What to test

1. **Old-style call still works:** `getLeaderboard(10, 0)` → returns results
2. **New options-style call:** `getLeaderboard({ limit: 10, version: 3 })` → returns version 3
3. **Default call:** `getLeaderboard()` → returns current version
4. **Response includes reset_schedule:** All responses have `reset_schedule` field
5. **Version fields only present for resetting boards:** `none` boards don't have `version`, `oldest_version`, `next_reset`
6. **TypeScript types compile correctly:** No type errors

---

## Phase 8: Archive Cleanup + Retention

**Goal:** Implement a retention policy to automatically delete old archived versions, preventing unbounded storage growth on Supabase free tier.

### Retention defaults

Define in a constants file so they're easy to change:

```typescript
// keeperboard/src/lib/constants/retention.ts
export const VERSION_RETENTION = {
  daily: 30,   // Keep last 30 daily versions
  weekly: 12,  // Keep last 12 weekly versions
  monthly: 12, // Keep last 12 monthly versions
} as const;
```

### Implementation approach

**Add cleanup logic to `resolveCurrentVersion()` in `keeperboard/src/lib/api/version.ts`:**

When a version advance happens (lazy reset triggers), also check if old versions should be cleaned up:

1. After advancing version, calculate `oldestAllowedVersion = current_version - retention_limit`
2. If there are scores with `version < oldestAllowedVersion`, delete them
3. This is a single DELETE query: `DELETE FROM scores WHERE leaderboard_id = X AND version < oldestAllowedVersion`

**Why during lazy reset:** Cleanup only needs to happen when a new version is created. No need for a separate cron job. Piggybacks on the lazy reset mechanism.

### Files to create

**`keeperboard/src/lib/constants/retention.ts`** — Retention limits constant

### Files to modify

**`keeperboard/src/lib/api/version.ts`** — Add cleanup after version advance

### What to test

1. **Retention limits are respected:** After advancing to version 35 on a daily board, versions 1-4 are deleted (only last 30 kept)
2. **No cleanup on 'none' boards:** All-time leaderboards never have scores deleted
3. **No cleanup when within limits:** Version 5 on a weekly board → no deletions
4. **`oldest_version` in API response reflects actual oldest:** After cleanup, `oldest_version` is correct
5. **Retention constants are easy to change:** Modify constant, rebuild, new value takes effect

---

## Phase 9: Integration Testing & Polish

**Goal:** End-to-end testing of the full flow, fix edge cases, update documentation.

### Testing checklist

**Full flow — 'none' (all-time) leaderboard:**
1. Create leaderboard via dashboard (default settings) → verify `reset_schedule: "none"` in DB
2. Submit scores via SDK → scores have `version: 1`
3. Get leaderboard via SDK → response has `reset_schedule: "none"`, no version fields
4. Dashboard shows leaderboard exactly as before (no version navigation, no reset info beyond the label)
5. All existing tests/behavior unchanged

**Full flow — 'daily' leaderboard:**
1. Create leaderboard via dashboard with `reset_schedule: "daily"`, `reset_hour: 0`
2. Submit scores via SDK → scores have `version: 1`
3. Get leaderboard → returns scores, `reset_schedule: "daily"`, `version: 1`, `next_reset`
4. Manually advance time (update `current_period_start` to yesterday in DB for testing)
5. Submit new score → triggers lazy reset, `current_version` advances to 2
6. Get leaderboard → shows only version 2 scores, `version: 2`, `oldest_version: 1`
7. Get leaderboard with `?version=1` → shows old scores
8. Dashboard: version navigation works, shows countdown, historical version is read-only

**Full flow — 'weekly' leaderboard:**
- Same as daily but with weekly periods

**Full flow — 'monthly' leaderboard:**
- Same as daily but with monthly periods

**Edge cases to verify:**
1. Multiple periods elapsed (no access for 3 weeks on weekly board) → version advances by correct amount
2. Player submits score in version 1, new version starts, player submits again → has separate scores in each version
3. Race condition: two simultaneous requests at reset boundary → only one advances version
4. Importing scores goes to current version
5. Clearing scores only clears current version
6. Retention cleanup triggers correctly

### Files to update

**`docs/future-features.md`** — Mark "Time-based Leaderboards" as completed

**`CLAUDE.md`** — Update active plan reference to Plan 3 and mark as complete

**`README.md`** —
- Add time-based leaderboards to features list
- Update API documentation with new query params
- Update SDK usage examples with version querying

**`docs/plans/3_time-based-leaderboards.md`** — Mark all phases complete

### What to test

- Run through every item in the testing checklist above
- Verify the app builds without TypeScript errors: `npm run build`
- Verify the SDK compiles: `cd sdk && npx tsc`
