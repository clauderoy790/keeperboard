import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { corsHeaders } from '@/lib/utils/cors';
import { validateApiKey } from '@/lib/api/auth';
import { resolveLeaderboard } from '@/lib/api/leaderboard';
import { resolveCurrentVersion } from '@/lib/api/version';

interface ClaimRequest {
  player_guid: string;
  player_name: string;
}

export async function POST(request: Request) {
  try {
    // Validate API key
    const { gameId, environmentId, rateLimitHeaders } = await validateApiKey(request);

    // Parse request body
    const body = (await request.json()) as ClaimRequest;
    const { player_guid, player_name } = body;

    // Validation
    if (!player_guid || !player_name) {
      return errorResponse(
        'Missing required fields: player_guid, player_name',
        'INVALID_REQUEST',
        400,
        corsHeaders
      );
    }

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

    const supabase = createAdminClient();

    // Find migrated score matching player_name in current version that hasn't been claimed yet
    const { data: migratedScore, error: findError } = await supabase
      .from('scores')
      .select('id, score, player_name')
      .eq('leaderboard_id', leaderboard.leaderboardId)
      .eq('player_name', player_name)
      .eq('version', currentVersion)
      .eq('is_migrated', true)
      .is('player_guid', null)
      .single();

    if (findError || !migratedScore) {
      return errorResponse(
        'No unclaimed score found for this player name',
        'NOT_FOUND',
        404,
        corsHeaders
      );
    }

    // Check if this player_guid already has a score on this leaderboard in current version
    const { data: existingScore } = await supabase
      .from('scores')
      .select('id')
      .eq('leaderboard_id', leaderboard.leaderboardId)
      .eq('player_guid', player_guid)
      .eq('version', currentVersion)
      .single();

    if (existingScore) {
      return errorResponse(
        'This player_guid already has a score on this leaderboard',
        'ALREADY_CLAIMED',
        409,
        corsHeaders
      );
    }

    // Claim the score by setting player_guid
    const { error: updateError } = await supabase
      .from('scores')
      .update({
        player_guid,
        updated_at: new Date().toISOString(),
      })
      .eq('id', migratedScore.id);

    if (updateError) {
      throw updateError;
    }

    // Calculate rank in current version
    const { count } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('leaderboard_id', leaderboard.leaderboardId)
      .eq('version', currentVersion)
      .gt('score', migratedScore.score);

    const rank = (count ?? 0) + 1;

    return successResponse(
      {
        claimed: true,
        score: migratedScore.score,
        rank,
        player_name: migratedScore.player_name,
      },
      200,
      { ...corsHeaders, ...rateLimitHeaders }
    );
  } catch (error) {
    console.error('Claim error:', error);

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
      'Failed to claim score',
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
