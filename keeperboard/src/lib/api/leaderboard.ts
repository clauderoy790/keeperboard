import { createAdminClient } from '@/lib/supabase/admin';

export interface LeaderboardResolveResult {
  leaderboardId: string;
  sortOrder: 'asc' | 'desc';
  resetSchedule: 'none' | 'daily' | 'weekly' | 'monthly';
  resetHour: number;
  currentVersion: number;
  currentPeriodStart: string;
}

/**
 * Resolves a leaderboard for a given game and environment.
 * If a specific leaderboard name is provided, looks it up (case-insensitive).
 * Otherwise, returns the first/default leaderboard for the game + environment.
 *
 * @param gameId - The game ID
 * @param environmentId - The environment ID
 * @param leaderboardName - Optional leaderboard name
 * @returns LeaderboardResolveResult if found, or throws an error
 * @throws Error if leaderboard not found
 */
export async function resolveLeaderboard(
  gameId: string,
  environmentId: string,
  leaderboardName?: string
): Promise<LeaderboardResolveResult> {
  const supabase = createAdminClient();

  let query = supabase
    .from('leaderboards')
    .select('id, sort_order, reset_schedule, reset_hour, current_version, current_period_start')
    .eq('game_id', gameId)
    .eq('environment_id', environmentId);

  if (leaderboardName) {
    // Look up specific leaderboard by name (case-insensitive)
    query = query.ilike('name', leaderboardName);
  } else {
    // Get first leaderboard (ordered by created_at)
    query = query.order('created_at', { ascending: true }).limit(1);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    if (leaderboardName) {
      throw new Error(`Leaderboard '${leaderboardName}' not found`);
    } else {
      throw new Error('No leaderboards found for this game/environment');
    }
  }

  return {
    leaderboardId: data.id,
    sortOrder: data.sort_order === 'asc' ? 'asc' : 'desc',
    resetSchedule: data.reset_schedule as 'none' | 'daily' | 'weekly' | 'monthly',
    resetHour: data.reset_hour,
    currentVersion: data.current_version,
    currentPeriodStart: data.current_period_start,
  };
}
