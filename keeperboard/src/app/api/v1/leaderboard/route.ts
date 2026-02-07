import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { corsHeaders } from '@/lib/utils/cors';
import { validateApiKey } from '@/lib/api/auth';
import { resolveLeaderboard } from '@/lib/api/leaderboard';

export async function GET(request: Request) {
  try {
    // Validate API key
    const { gameId, environmentId, rateLimitHeaders } = await validateApiKey(request);

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const leaderboardSlug = searchParams.get('leaderboard') || undefined;

    // Resolve leaderboard
    const { leaderboardId, sortOrder } = await resolveLeaderboard(
      gameId,
      environmentId,
      leaderboardSlug
    );

    const supabase = createAdminClient();

    // Get total count
    const { count: totalCount } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('leaderboard_id', leaderboardId);

    // Get paginated scores sorted by leaderboard's sort order
    const { data: scores, error } = await supabase
      .from('scores')
      .select('player_guid, player_name, score')
      .eq('leaderboard_id', leaderboardId)
      .order('score', { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Add rank to each entry
    const entries = (scores ?? []).map((score, index) => ({
      rank: offset + index + 1,
      player_guid: score.player_guid,
      player_name: score.player_name,
      score: score.score,
    }));

    return successResponse(
      {
        entries,
        total_count: totalCount ?? 0,
      },
      200,
      { ...corsHeaders, ...rateLimitHeaders }
    );
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
