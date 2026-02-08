-- Migration 003: Remove Leaderboard Slug
-- Simplifies the schema by using name as the identifier instead of a separate slug field.
-- The API will accept the leaderboard name directly (URL-encoded).

-- ============================================
-- 1. UPDATE UNIQUE CONSTRAINT
-- ============================================

-- Drop the old constraint that includes slug
ALTER TABLE leaderboards DROP CONSTRAINT IF EXISTS leaderboards_game_id_slug_environment_id_key;
ALTER TABLE leaderboards DROP CONSTRAINT IF EXISTS leaderboards_game_id_slug_key;

-- Add new constraint: unique name per game+environment (case-insensitive)
-- Using a unique index on LOWER(name) for case-insensitive uniqueness
CREATE UNIQUE INDEX leaderboards_game_env_name_unique
  ON leaderboards (game_id, environment_id, LOWER(name));

-- ============================================
-- 2. DROP SLUG COLUMN
-- ============================================

ALTER TABLE leaderboards DROP COLUMN slug;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Next steps:
-- 1. Run this migration in your Supabase SQL Editor
-- 2. Regenerate TypeScript types
-- 3. Update API routes to lookup by name instead of slug
-- 4. Update dashboard forms to remove slug field
