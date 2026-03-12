import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { corsHeaders } from '@/lib/utils/cors';
import { validateApiKey } from '@/lib/api/auth';
import { resolveLeaderboard } from '@/lib/api/leaderboard';

interface StartRunRequest {
  player_guid: string;
}

/**
 * POST /api/v1/runs/start
 *
 * Starts a new game run for anti-cheat tracking.
 * Returns a run_id that must be used when submitting the score.
 *
 * Required headers:
 * - X-API-Key: API key for the game
 *
 * Query params:
 * - leaderboard: Optional leaderboard name (defaults to first leaderboard)
 *
 * Request body:
 * - player_guid: Unique player identifier
 *
 * Response:
 * - run_id: UUID to use when finishing the run
 * - started_at: ISO timestamp when run started
 * - expires_at: ISO timestamp when run expires (1 hour)
 */
export async function POST(request: Request) {
  try {
    // Validate API key
    const { gameId, environmentId, rateLimitHeaders } =
      await validateApiKey(request);

    // Parse request body
    const body = (await request.json()) as StartRunRequest;
    const { player_guid } = body;

    // Basic validation
    if (!player_guid) {
      return errorResponse(
        'Missing required field: player_guid',
        'INVALID_REQUEST',
        400,
        corsHeaders
      );
    }

    // Get leaderboard name from query params (optional)
    const { searchParams } = new URL(request.url);
    const leaderboardName = searchParams.get('leaderboard') || undefined;

    // Resolve leaderboard
    const leaderboard = await resolveLeaderboard(
      gameId,
      environmentId,
      leaderboardName
    );

    // Create game run record
    const supabase = createAdminClient();
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + 60 * 60 * 1000); // 1 hour expiration

    const { data: run, error: insertError } = await supabase
      .from('game_runs')
      .insert({
        leaderboard_id: leaderboard.leaderboardId,
        player_guid,
        started_at: startedAt.toISOString(),
      })
      .select('id, started_at')
      .single();

    if (insertError) {
      console.error('Failed to create game run:', insertError);
      throw insertError;
    }

    return successResponse(
      {
        run_id: run.id,
        started_at: run.started_at,
        expires_at: expiresAt.toISOString(),
      },
      200,
      { ...corsHeaders, ...rateLimitHeaders }
    );
  } catch (error) {
    console.error('Start run error:', error);

    // Handle specific API key validation errors
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
      'Failed to start run',
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
