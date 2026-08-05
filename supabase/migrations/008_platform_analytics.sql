-- Migration: Platform tracking & analytics dimensions
-- Plan 24, Phase 1
--
-- Adds the platform dimension to scores, plus the four analytics dimensions to game_runs.
-- Every column lands in this one migration even though the charts that read country,
-- game_version and source are built in later phases: uncollected data cannot be
-- backfilled, so collection starts now and display catches up.
--
-- All columns are nullable. Absent is not the same as invalid — the 536 existing scores
-- and every client on SDK <= 2.2.2 send nothing, and must keep working.

-- ---------------------------------------------------------------------------
-- scores.platform
-- ---------------------------------------------------------------------------
-- Not redundant with game_runs.platform: games without anti-cheat enabled POST
-- straight to /v1/scores and never create a run, so scores.run_id is NULL and
-- there is nothing to join to.
ALTER TABLE scores ADD COLUMN platform TEXT;

COMMENT ON COLUMN scores.platform IS
  'Build the score was submitted from. NULL for scores predating SDK 2.3.0.';

-- ---------------------------------------------------------------------------
-- game_runs analytics dimensions
-- ---------------------------------------------------------------------------
ALTER TABLE game_runs
ADD COLUMN platform     TEXT,
ADD COLUMN country      TEXT,
ADD COLUMN game_version TEXT,
ADD COLUMN source       TEXT;

COMMENT ON COLUMN game_runs.platform IS
  'Build this run was played on. Developer-supplied via SDK config — cannot be
   inferred server-side, since an iOS app and Safari on iPhone are identical from
   inside the page.';
COMMENT ON COLUMN game_runs.country IS
  'ISO-3166 alpha-2, derived server-side from the x-vercel-ip-country header.
   NULL in local development, which is correct — no invented data.';
COMMENT ON COLUMN game_runs.game_version IS
  'Optional build identifier supplied by the game, e.g. "1.4.2". Enables
   retention-by-version comparisons.';
COMMENT ON COLUMN game_runs.source IS
  'First-touch ?ref= tag captured on the player''s first arrival. Web only —
   app installs cannot carry attribution through the App Store or Play Store.';

-- ---------------------------------------------------------------------------
-- Constraints
-- ---------------------------------------------------------------------------
-- The API validates and 400s on an unrecognized platform, but the DB is the
-- last line of defence: these tables are also written by the admin client.
-- NULL is always permitted.
ALTER TABLE scores ADD CONSTRAINT scores_platform_check
  CHECK (platform IS NULL OR platform IN ('web','ios','android','windows','macos','linux'));

ALTER TABLE game_runs ADD CONSTRAINT game_runs_platform_check
  CHECK (platform IS NULL OR platform IN ('web','ios','android','windows','macos','linux'));

ALTER TABLE game_runs ADD CONSTRAINT game_runs_country_check
  CHECK (country IS NULL OR country ~ '^[A-Z]{2}$');

-- Length caps on the free-text dimensions. The SDK sanitizes these, but /v1/runs/start
-- is a public endpoint and anything with a valid API key can post arbitrary strings.
ALTER TABLE game_runs ADD CONSTRAINT game_runs_game_version_check
  CHECK (game_version IS NULL OR char_length(game_version) <= 32);

ALTER TABLE game_runs ADD CONSTRAINT game_runs_source_check
  CHECK (source IS NULL OR char_length(source) <= 64);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- Every analytics query filters by leaderboard (to scope to an environment) and a
-- date range, then aggregates over player_guid. One composite covers all of them.
--
-- Deliberately NOT adding standalone indexes on platform or started_at:
--   * platform has six possible values, so a btree on it alone will never be chosen
--     over a scan, and the column is only ever queried alongside leaderboard + date.
--   * started_at alone is redundant — it is the second column of the composite below,
--     and no analytics query filters on date without also scoping to leaderboards.
-- game_runs takes an insert on every startRun(), so unused indexes are a real
-- write cost on the hottest table in the schema. Add them later if a query
-- measurably needs one.
CREATE INDEX game_runs_analytics_idx
  ON game_runs (leaderboard_id, started_at, player_guid);

-- Note: the pre-existing game_runs_leaderboard_idx (leaderboard_id) from migration 006
-- is now fully redundant — leaderboard_id is the leading column of the composite above.
-- Left in place deliberately; dropping it is a safe follow-up, not part of this change.
