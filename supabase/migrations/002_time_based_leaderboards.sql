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
-- 2. Regenerate TypeScript types: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > keeperboard/src/types/database.ts
