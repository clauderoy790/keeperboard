import { createAdminClient } from '@/lib/supabase/admin';

interface GameSettings {
  profanityFilterEnabled: boolean;
}

/**
 * Fetch game settings by game ID.
 * Used to check if profanity filter is enabled for the game.
 */
export async function getGameSettings(gameId: string): Promise<GameSettings> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('games')
    .select('profanity_filter_enabled')
    .eq('id', gameId)
    .single();

  if (error || !data) {
    // Default to enabled if game not found (shouldn't happen after auth)
    return { profanityFilterEnabled: true };
  }

  return {
    profanityFilterEnabled: data.profanity_filter_enabled,
  };
}

/**
 * Anti-cheat settings combining game-level and leaderboard-level config.
 */
export interface AntiCheatSettings {
  /** Whether HMAC signing is required for this game */
  signingEnabled: boolean;
  /** The HMAC signing secret (null if not generated yet) */
  signingSecret: string | null;
  /** Maximum allowed score (null = no limit) */
  scoreCap: number | null;
  /** Minimum game duration in seconds */
  minElapsedSeconds: number;
  /** Whether run tokens are required for score submission */
  requireRunToken: boolean;
}

/**
 * Fetch anti-cheat settings for a game/leaderboard combination.
 * Combines game-level signing settings with leaderboard-level validation settings.
 */
export async function getAntiCheatSettings(
  gameId: string,
  leaderboardId: string
): Promise<AntiCheatSettings> {
  const supabase = createAdminClient();

  // Fetch game signing settings
  const { data: gameData, error: gameError } = await supabase
    .from('games')
    .select('signing_enabled, signing_secret')
    .eq('id', gameId)
    .single();

  // Fetch leaderboard validation settings
  const { data: lbData, error: lbError } = await supabase
    .from('leaderboards')
    .select('score_cap, min_elapsed_seconds, require_run_token')
    .eq('id', leaderboardId)
    .single();

  // Return safe defaults if queries fail
  if (gameError || !gameData || lbError || !lbData) {
    return {
      signingEnabled: false,
      signingSecret: null,
      scoreCap: null,
      minElapsedSeconds: 5,
      requireRunToken: false,
    };
  }

  return {
    signingEnabled: gameData.signing_enabled,
    signingSecret: gameData.signing_secret,
    scoreCap: lbData.score_cap,
    minElapsedSeconds: lbData.min_elapsed_seconds,
    requireRunToken: lbData.require_run_token,
  };
}
