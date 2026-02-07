import { createAdminClient } from '@/lib/supabase/admin';

export interface LeaderboardResolveResult {
  leaderboardId: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Resolves a leaderboard for a given game and environment.
 * If a specific leaderboard slug is provided, looks it up.
 * Otherwise, returns the first/default leaderboard for the game + environment.
 *
 * @param gameId - The game ID
 * @param environmentId - The environment ID
 * @param leaderboardSlug - Optional leaderboard slug
 * @returns LeaderboardResolveResult if found, or throws an error
 * @throws Error if leaderboard not found
 */
export async function resolveLeaderboard(
  gameId: string,
  environmentId: string,
  leaderboardSlug?: string
): Promise<LeaderboardResolveResult> {
  const supabase = createAdminClient();

  let query = supabase
    .from('leaderboards')
    .select('id, sort_order')
    .eq('game_id', gameId)
    .eq('environment_id', environmentId);

  if (leaderboardSlug) {
    // Look up specific leaderboard by slug
    query = query.eq('slug', leaderboardSlug);
  } else {
    // Get first leaderboard (ordered by created_at)
    query = query.order('created_at', { ascending: true }).limit(1);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    if (leaderboardSlug) {
      throw new Error(`Leaderboard '${leaderboardSlug}' not found`);
    } else {
      throw new Error('No leaderboards found for this game/environment');
    }
  }

  return {
    leaderboardId: data.id,
    sortOrder: data.sort_order === 'asc' ? 'asc' : 'desc',
  };
}
