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
