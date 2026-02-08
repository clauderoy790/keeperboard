import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { corsHeaders } from '@/lib/utils/cors';
import { validateApiKey } from '@/lib/api/auth';
import { resolveLeaderboard } from '@/lib/api/leaderboard';
import { resolveCurrentVersion } from '@/lib/api/version';

export async function GET(request: Request) {
  try {
    // Validate API key
    const { gameId, environmentId, rateLimitHeaders } = await validateApiKey(request);

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const leaderboardName = searchParams.get('leaderboard') || undefined;
    const versionParam = searchParams.get('version');

    // Resolve leaderboard
    const leaderboard = await resolveLeaderboard(
      gameId,
      environmentId,
      leaderboardName
    );

    const supabase = createAdminClient();

    // Resolve current version (lazy reset)
    const versionInfo = await resolveCurrentVersion({
      id: leaderboard.leaderboardId,
      reset_schedule: leaderboard.resetSchedule,
      reset_hour: leaderboard.resetHour,
      current_version: leaderboard.currentVersion,
      current_period_start: leaderboard.currentPeriodStart,
    });

    // Determine which version to query
    let targetVersion: number;
    if (leaderboard.resetSchedule === 'none') {
      // For 'none' leaderboards, always use version 1
      targetVersion = 1;
    } else if (versionParam) {
      // Validate requested version
      targetVersion = parseInt(versionParam);

      // Get oldest available version
      const { data: oldestScoreData } = await supabase
        .from('scores')
        .select('version')
        .eq('leaderboard_id', leaderboard.leaderboardId)
        .order('version', { ascending: true })
        .limit(1)
        .single();

      const oldestVersion = oldestScoreData?.version ?? versionInfo.version;

      if (targetVersion < oldestVersion || targetVersion > versionInfo.version) {
        return errorResponse(
          `Invalid version. Available versions: ${oldestVersion} to ${versionInfo.version}`,
          'INVALID_VERSION',
          400,
          corsHeaders
        );
      }
    } else {
      // Default to current version
      targetVersion = versionInfo.version;
    }

    // Get total count for target version
    const { count: totalCount } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('leaderboard_id', leaderboard.leaderboardId)
      .eq('version', targetVersion);

    // Get paginated scores sorted by leaderboard's sort order
    const { data: scores, error } = await supabase
      .from('scores')
      .select('player_guid, player_name, score')
      .eq('leaderboard_id', leaderboard.leaderboardId)
      .eq('version', targetVersion)
      .order('score', { ascending: leaderboard.sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Add rank to each entry
    const entries = (scores ?? []).map((score, index) => ({
      rank: offset + index + 1,
      player_guid: score.player_guid,
      player_name: score.player_name,
      score: score.score,
    }));

    // Build response based on reset schedule
    if (leaderboard.resetSchedule === 'none') {
      return successResponse(
        {
          entries,
          total_count: totalCount ?? 0,
          reset_schedule: 'none',
        },
        200,
        { ...corsHeaders, ...rateLimitHeaders }
      );
    } else {
      // Get oldest available version
      const { data: oldestScoreData } = await supabase
        .from('scores')
        .select('version')
        .eq('leaderboard_id', leaderboard.leaderboardId)
        .order('version', { ascending: true })
        .limit(1)
        .single();

      const oldestVersion = oldestScoreData?.version ?? versionInfo.version;

      return successResponse(
        {
          entries,
          total_count: totalCount ?? 0,
          reset_schedule: leaderboard.resetSchedule,
          version: targetVersion,
          oldest_version: oldestVersion,
          next_reset: versionInfo.nextReset,
        },
        200,
        { ...corsHeaders, ...rateLimitHeaders }
      );
    }
  } catch (error) {
    console.error('Leaderboard fetch error:', error);

    // Handle specific errors
    if (error instanceof Error) {
      const errorWithHeaders = error as Error & {
        code?: string;
        headers?: Record<string, string>;
      };

      if (errorWithHeaders.code === 'RATE_LIMITED') {
        return errorResponse(
          'Rate limit exceeded',
          'RATE_LIMITED',
          429,
          { ...corsHeaders, ...errorWithHeaders.headers }
        );
      }

      if (
        error.message.includes('Missing X-API-Key') ||
        error.message.includes('Invalid API key')
      ) {
        return errorResponse(error.message, 'INVALID_API_KEY', 401, corsHeaders);
      }
      if (error.message.includes('not found')) {
        return errorResponse(error.message, 'NOT_FOUND', 404, corsHeaders);
      }
    }

    return errorResponse(
      'Failed to fetch leaderboard',
      'INTERNAL_ERROR',
      500,
      corsHeaders
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
