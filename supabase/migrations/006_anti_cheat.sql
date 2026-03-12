-- Migration: Add anti-cheat security features
-- Adds signing secrets, run tokens, and score validation settings

-- Signing secrets for HMAC validation (per-game)
ALTER TABLE games
ADD COLUMN signing_secret TEXT,
ADD COLUMN signing_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN games.signing_secret IS
  'HMAC signing secret for request validation. Keep secret - only shown once in dashboard.';
COMMENT ON COLUMN games.signing_enabled IS
  'When true, all score submissions require valid HMAC signature.';

-- Anti-cheat settings (per-leaderboard)
ALTER TABLE leaderboards
ADD COLUMN score_cap INTEGER,
ADD COLUMN min_elapsed_seconds INTEGER NOT NULL DEFAULT 5,
ADD COLUMN require_run_token BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN leaderboards.score_cap IS
  'Maximum allowed score. Submissions above this are rejected. NULL = no limit.';
COMMENT ON COLUMN leaderboards.min_elapsed_seconds IS
  'Minimum game duration in seconds. Submissions faster than this are rejected.';
COMMENT ON COLUMN leaderboards.require_run_token IS
  'When true, scores must be submitted via /runs/finish with a valid run token.';

-- Game runs table for session tokens
CREATE TABLE game_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaderboard_id UUID NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
  player_guid TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  score INTEGER,
  elapsed_seconds INTEGER,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE game_runs IS
  'Tracks game sessions for anti-cheat. Run tokens ensure scores come from actual game sessions.';

-- Indexes for efficient lookups
CREATE INDEX game_runs_lookup_idx ON game_runs(id, used);
CREATE INDEX game_runs_player_idx ON game_runs(player_guid, leaderboard_id);
CREATE INDEX game_runs_leaderboard_idx ON game_runs(leaderboard_id);

-- Link scores to runs for elapsed time tracking
ALTER TABLE scores
ADD COLUMN run_id UUID REFERENCES game_runs(id);

COMMENT ON COLUMN scores.run_id IS
  'Reference to the game run that produced this score. NULL for legacy scores.';

CREATE INDEX scores_run_id_idx ON scores(run_id);

-- RLS policies for game_runs
ALTER TABLE game_runs ENABLE ROW LEVEL SECURITY;

-- Runs are managed via API keys (admin client), not user auth
-- The API validates the API key before any run operations
CREATE POLICY "Service role can manage runs" ON game_runs
  FOR ALL USING (true);
