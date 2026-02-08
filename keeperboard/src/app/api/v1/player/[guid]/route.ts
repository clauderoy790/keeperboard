import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { corsHeaders } from '@/lib/utils/cors';
import { validateApiKey } from '@/lib/api/auth';
import { resolveLeaderboard } from '@/lib/api/leaderboard';
import { resolveCurrentVersion } from '@/lib/api/version';

interface RouteParams {
  params: Promise<{ guid: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Validate API key
    const { gameId, environmentId, rateLimitHeaders } = await validateApiKey(request);

    // Get leaderboard slug from query params (optional)
    const { searchParams } = new URL(request.url);
    const leaderboardSlug = searchParams.get('leaderboard') || undefined;

    // Resolve leaderboard
    const leaderboard = await resolveLeaderboard(
      gameId,
      environmentId,
      leaderboardSlug
    );

    // Resolve current version (lazy reset)
    const { version: currentVersion } = await resolveCurrentVersion({
      id: leaderboard.leaderboardId,
      reset_schedule: leaderboard.resetSchedule,
      reset_hour: leaderboard.resetHour,
      current_version: leaderboard.currentVersion,
      current_period_start: leaderboard.currentPeriodStart,
    });

    const { guid } = await params;
    const supabase = createAdminClient();

    // Get player's score in current version
    const { data: playerScore, error } = await supabase
      .from('scores')
      .select('id, player_guid, player_name, score')
      .eq('leaderboard_id', leaderboard.leaderboardId)
      .eq('player_guid', guid)
      .eq('version', currentVersion)
      .single();

    if (error || !playerScore) {
      return errorResponse(
        'Player not found',
        'NOT_FOUND',
        404,
        corsHeaders
      );
    }

    // Calculate rank in current version
    const { count } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('leaderboard_id', leaderboard.leaderboardId)
      .eq('version', currentVersion)
      .gt('score', playerScore.score);

    const rank = (count ?? 0) + 1;

    return successResponse(
      {
        id: playerScore.id,
        player_guid: playerScore.player_guid,
        player_name: playerScore.player_name,
        score: playerScore.score,
        rank,
      },
      200,
      { ...corsHeaders, ...rateLimitHeaders }
    );
  } catch (error) {
    console.error('Player fetch error:', error);

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
      'Failed to fetch player',
      'INTERNAL_ERROR',
      500,
      corsHeaders
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    // Validate API key
    const { gameId, environmentId, rateLimitHeaders } = await validateApiKey(request);

    // Get leaderboard slug from query params (optional)
    const { searchParams } = new URL(request.url);
    const leaderboardSlug = searchParams.get('leaderboard') || undefined;

    // Resolve leaderboard
    const leaderboard = await resolveLeaderboard(
      gameId,
      environmentId,
      leaderboardSlug
    );

    // Resolve current version (lazy reset)
    const { version: currentVersion } = await resolveCurrentVersion({
      id: leaderboard.leaderboardId,
      reset_schedule: leaderboard.resetSchedule,
      reset_hour: leaderboard.resetHour,
      current_version: leaderboard.currentVersion,
      current_period_start: leaderboard.currentPeriodStart,
    });

    const { guid } = await params;
    const body = await request.json();
    const { player_name } = body;

    if (!player_name || typeof player_name !== 'string') {
      return errorResponse(
        'Missing required field: player_name',
        'INVALID_REQUEST',
        400,
        corsHeaders
      );
    }

    const supabase = createAdminClient();

    // Get existing score in current version
    const { data: existingScore, error: fetchError } = await supabase
      .from('scores')
      .select('id, score')
      .eq('leaderboard_id', leaderboard.leaderboardId)
      .eq('player_guid', guid)
      .eq('version', currentVersion)
      .single();

    if (fetchError || !existingScore) {
      return errorResponse(
        'Player not found',
        'NOT_FOUND',
        404,
        corsHeaders
      );
    }

    // Update player name
    const { error: updateError } = await supabase
      .from('scores')
      .update({
        player_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingScore.id);

    if (updateError) throw updateError;

    // Calculate rank in current version
    const { count } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('leaderboard_id', leaderboard.leaderboardId)
      .eq('version', currentVersion)
      .gt('score', existingScore.score);

    const rank = (count ?? 0) + 1;

    return successResponse(
      {
        id: existingScore.id,
        player_guid: guid,
        player_name,
        score: existingScore.score,
        rank,
      },
      200,
      { ...corsHeaders, ...rateLimitHeaders }
    );
  } catch (error) {
    console.error('Player update error:', error);

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
      'Failed to update player',
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
