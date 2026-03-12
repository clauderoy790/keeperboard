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
 * Anti-cheat settings at game level.
 * When signingEnabled is true, both HMAC signing AND run tokens are required.
 */
export interface AntiCheatSettings {
  /** Master anti-cheat toggle. When true: requires HMAC signatures AND run tokens. */
  signingEnabled: boolean;
  /** The HMAC signing secret (null if not generated yet) */
  signingSecret: string | null;
  /** Maximum allowed score (null = no limit) */
  scoreCap: number | null;
  /** Minimum game duration in seconds */
  minElapsedSeconds: number;
}

/**
 * Fetch anti-cheat settings for a game.
 * All anti-cheat settings are now at game level for simplicity.
 */
export async function getAntiCheatSettings(gameId: string): Promise<AntiCheatSettings> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('games')
    .select('signing_enabled, signing_secret, score_cap, min_elapsed_seconds')
    .eq('id', gameId)
    .single();

  // Return safe defaults if query fails
  if (error || !data) {
    return {
      signingEnabled: false,
      signingSecret: null,
      scoreCap: null,
      minElapsedSeconds: 5,
    };
  }

  return {
    signingEnabled: data.signing_enabled,
    signingSecret: data.signing_secret,
    scoreCap: data.score_cap,
    minElapsedSeconds: data.min_elapsed_seconds,
  };
}
