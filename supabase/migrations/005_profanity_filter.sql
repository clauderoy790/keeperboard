-- Migration: Add profanity filter setting to games table
-- Default true: enabled for all existing and new games

ALTER TABLE games
ADD COLUMN profanity_filter_enabled BOOLEAN NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN games.profanity_filter_enabled IS
  'When true, player names are checked for profanity before score submission';
