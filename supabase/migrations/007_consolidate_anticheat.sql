-- Migration: Consolidate anti-cheat settings to game level
-- Moves score_cap, min_elapsed_seconds from leaderboards to games
-- Removes require_run_token (now implied by signing_enabled)

-- Add anti-cheat settings to games table
ALTER TABLE games
ADD COLUMN score_cap INTEGER,
ADD COLUMN min_elapsed_seconds INTEGER NOT NULL DEFAULT 5;

COMMENT ON COLUMN games.score_cap IS
  'Maximum allowed score. Submissions above this are rejected. NULL = no limit.';
COMMENT ON COLUMN games.min_elapsed_seconds IS
  'Minimum game duration in seconds. Submissions faster than this are rejected.';

-- Remove anti-cheat settings from leaderboards table
ALTER TABLE leaderboards
DROP COLUMN score_cap,
DROP COLUMN min_elapsed_seconds,
DROP COLUMN require_run_token;

-- Update games.signing_enabled comment to reflect it's now the single anti-cheat toggle
COMMENT ON COLUMN games.signing_enabled IS
  'Master anti-cheat toggle. When true: requires HMAC signatures AND run tokens for all score submissions.';
