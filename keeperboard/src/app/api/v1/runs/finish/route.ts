import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { corsHeaders } from '@/lib/utils/cors';
import { validateApiKey } from '@/lib/api/auth';
import { getAntiCheatSettings, getGameSettings } from '@/lib/api/game';
import { resolveCurrentVersion } from '@/lib/api/version';
import { containsProfanity } from '@/lib/profanity';
import { validateSignature, validateTimestamp } from '@/lib/api/signature';
import type { Json } from '@/types/database';

interface FinishRunRequest {
  run_id: string;
  player_guid: string;
  player_name: string;
  score: number;
  timestamp?: number;
  metadata?: Json;
}

// Run expiration time in milliseconds (1 hour)
const RUN_EXPIRATION_MS = 60 * 60 * 1000;

/**
 * POST /api/v1/runs/finish
 *
 * Finishes a game run and submits the score.
 * Validates elapsed time, score caps, and one-time use.
 *
 * Required headers:
 * - X-API-Key: API key for the game
 *
 * Request body:
 * - run_id: UUID from /runs/start
 * - player_guid: Must match the player_guid from start
 * - player_name: Display name for leaderboard
 * - score: Final score
 * - metadata: Optional metadata object
 *
 * Validations:
 * - Run exists and belongs to this player
 * - Run not already used
 * - Run not expired (1 hour)
 * - Elapsed time >= min_elapsed_seconds
 * - Score <= score_cap (if set)
 */
export async function POST(request: Request) {
  try {
    // Validate API key
    const { gameId, rateLimitHeaders } = await validateApiKey(request);

    // Parse request body
    const body = (await request.json()) as FinishRunRequest;
    const { run_id, player_guid, score, timestamp, metadata } = body;
    const player_name = body.player_name?.trim().replace(/ +/g, ' ');

    // Basic validation
    if (!run_id || !player_guid || !player_name || typeof score !== 'number') {
      return errorResponse(
        'Missing required fields: run_id, player_guid, player_name, score',
        'INVALID_REQUEST',
        400,
        corsHeaders
      );
    }

    const supabase = createAdminClient();

    // Look up the run
    const { data: run, error: runError } = await supabase
      .from('game_runs')
      .select(
        `
        id,
        leaderboard_id,
        player_guid,
        started_at,
        used,
        leaderboards!inner (
          id,
          game_id,
          environment_id,
          sort_order,
          reset_schedule,
          reset_hour,
          current_version,
          current_period_start
        )
      `
      )
      .eq('id', run_id)
      .single();

    if (runError || !run) {
      return errorResponse('Run not found', 'RUN_NOT_FOUND', 404, corsHeaders);
    }

    // Validate player_guid matches
    if (run.player_guid !== player_guid) {
      return errorResponse(
        'Player GUID mismatch',
        'PLAYER_MISMATCH',
        403,
        corsHeaders
      );
    }

    // Validate run not already used
    if (run.used) {
      return errorResponse(
        'Run already used',
        'RUN_ALREADY_USED',
        400,
        corsHeaders
      );
    }

    // Validate run not expired
    const startedAt = new Date(run.started_at).getTime();
    const now = Date.now();
    if (now - startedAt > RUN_EXPIRATION_MS) {
      return errorResponse('Run expired', 'RUN_EXPIRED', 400, corsHeaders);
    }

    // Get the leaderboard data from the join
    const leaderboard = run.leaderboards as {
      id: string;
      game_id: string;
      environment_id: string;
      sort_order: string;
      reset_schedule: string;
      reset_hour: number;
      current_version: number;
      current_period_start: string;
    };

    // Verify API key matches the game
    if (leaderboard.game_id !== gameId) {
      return errorResponse(
        'API key does not match game',
        'GAME_MISMATCH',
        403,
        corsHeaders
      );
    }

    // Get anti-cheat settings
    const antiCheat = await getAntiCheatSettings(gameId, leaderboard.id);

    // Validate signature if signing is enabled
    if (antiCheat.signingEnabled) {
      // Require timestamp when signing is enabled
      if (!timestamp || typeof timestamp !== 'number') {
        return errorResponse(
          'Missing or invalid timestamp (required when signing is enabled)',
          'INVALID_REQUEST',
          400,
          corsHeaders
        );
      }

      // Validate timestamp freshness and replay protection
      const timestampError = validateTimestamp(timestamp, player_guid);
      if (timestampError) {
        return errorResponse(timestampError, 'INVALID_TIMESTAMP', 400, corsHeaders);
      }

      // Require signature header
      const signature = request.headers.get('X-Signature');
      if (!signature) {
        return errorResponse(
          'Missing X-Signature header (required when signing is enabled)',
          'MISSING_SIGNATURE',
          401,
          corsHeaders
        );
      }

      // Validate signature (includes run_id and score)
      if (!antiCheat.signingSecret) {
        console.error('Signing enabled but no secret configured for game:', gameId);
        return errorResponse(
          'Server configuration error',
          'INTERNAL_ERROR',
          500,
          corsHeaders
        );
      }

      const isValid = validateSignature(
        { playerGuid: player_guid, timestamp, score, runId: run_id },
        signature,
        antiCheat.signingSecret
      );

      if (!isValid) {
        return errorResponse(
          'Invalid signature',
          'INVALID_SIGNATURE',
          401,
          corsHeaders
        );
      }
    }

    // Calculate elapsed time
    const elapsedSeconds = Math.floor((now - startedAt) / 1000);

    // Validate min elapsed time
    if (elapsedSeconds < antiCheat.minElapsedSeconds) {
      return errorResponse(
        `Game too short. Minimum ${antiCheat.minElapsedSeconds} seconds required.`,
        'ELAPSED_TIME_TOO_SHORT',
        400,
        corsHeaders
      );
    }

    // Validate score cap
    if (antiCheat.scoreCap !== null && score > antiCheat.scoreCap) {
      return errorResponse(
        `Score exceeds maximum allowed (${antiCheat.scoreCap})`,
        'SCORE_CAP_EXCEEDED',
        400,
        corsHeaders
      );
    }

    // Check profanity filter
    const gameSettings = await getGameSettings(gameId);
    if (gameSettings.profanityFilterEnabled && containsProfanity(player_name)) {
      return errorResponse(
        'Name contains inappropriate content',
        'PROFANITY_DETECTED',
        400,
        corsHeaders
      );
    }

    // Mark run as used and store elapsed time
    const { error: updateRunError } = await supabase
      .from('game_runs')
      .update({
        used: true,
        finished_at: new Date().toISOString(),
        elapsed_seconds: elapsedSeconds,
        score,
      })
      .eq('id', run_id);

    if (updateRunError) {
      console.error('Failed to update run:', updateRunError);
      throw updateRunError;
    }

    // Resolve current version (lazy reset)
    const { version: currentVersion } = await resolveCurrentVersion({
      id: leaderboard.id,
      reset_schedule: leaderboard.reset_schedule,
      reset_hour: leaderboard.reset_hour,
      current_version: leaderboard.current_version,
      current_period_start: leaderboard.current_period_start,
    });

    // Check for existing score in current version
    const { data: existingScore } = await supabase
      .from('scores')
      .select('id, score')
      .eq('leaderboard_id', leaderboard.id)
      .eq('player_guid', player_guid)
      .eq('version', currentVersion)
      .single();

    let isNewHighScore = false;
    let scoreId: string;
    let finalScore: number;

    if (existingScore) {
      // Only update if new score is higher
      if (score > existingScore.score) {
        const { data: updated, error: updateError } = await supabase
          .from('scores')
          .update({
            score,
            player_name,
            run_id,
            metadata: metadata || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingScore.id)
          .select('id')
          .single();

        if (updateError) throw updateError;

        scoreId = updated!.id;
        finalScore = score;
        isNewHighScore = true;
      } else {
        scoreId = existingScore.id;
        finalScore = existingScore.score;
        isNewHighScore = false;
      }
    } else {
      // Insert new score with run_id reference
      const { data: inserted, error: insertError } = await supabase
        .from('scores')
        .insert({
          leaderboard_id: leaderboard.id,
          player_guid,
          player_name,
          score,
          run_id,
          version: currentVersion,
          metadata: metadata || null,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      scoreId = inserted!.id;
      finalScore = score;
      isNewHighScore = true;
    }

    // Calculate rank
    const { count } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('leaderboard_id', leaderboard.id)
      .eq('version', currentVersion)
      .gt('score', finalScore);

    const rank = (count ?? 0) + 1;

    return successResponse(
      {
        success: true,
        id: scoreId,
        player_guid,
        player_name,
        score: finalScore,
        rank,
        is_new_high_score: isNewHighScore,
        elapsed_seconds: elapsedSeconds,
      },
      200,
      { ...corsHeaders, ...rateLimitHeaders }
    );
  } catch (error) {
    console.error('Finish run error:', error);

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
      'Failed to finish run',
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
