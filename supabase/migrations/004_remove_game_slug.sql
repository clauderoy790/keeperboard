-- Remove games.slug field (slug is no longer used)
-- 1. Drop unique constraints that reference slug if they exist
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_user_id_slug_key;
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_slug_key;

-- 2. Drop any index on slug if it exists
DROP INDEX IF EXISTS games_slug_idx;
DROP INDEX IF EXISTS games_user_id_slug_idx;

-- 3. Drop column
ALTER TABLE games DROP COLUMN IF EXISTS slug;
