import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { corsHeaders } from '@/lib/utils/cors';
import { validateApiKey } from '@/lib/api/auth';
import { resolveLeaderboard } from '@/lib/api/leaderboard';

interface ScoreSubmission {
  player_guid: string;
  player_name: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    // Validate API key
    const { gameId, environmentId } = await validateApiKey(request);

    // Parse request body
    const body = (await request.json()) as ScoreSubmission;
    const { player_guid, player_name, score, metadata } = body;

    // Basic validation
    if (!player_guid || !player_name || typeof score !== 'number') {
      return errorResponse(
        'Missing required fields: player_guid, player_name, score',
        'INVALID_REQUEST',
        400,
        corsHeaders
      );
    }

    // Get leaderboard slug from query params (optional)
    const { searchParams } = new URL(request.url);
    const leaderboardSlug = searchParams.get('leaderboard') || undefined;

    // Resolve leaderboard
    const { leaderboardId } = await resolveLeaderboard(
      gameId,
      environmentId,
      leaderboardSlug
    );

    const supabase = createAdminClient();

    // Check for existing score
    const { data: existingScore } = await supabase
      .from('scores')
      .select('id, score')
      .eq('leaderboard_id', leaderboardId)
      .eq('player_guid', player_guid)
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
            metadata: (metadata as any) || null,
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
        // Keep existing score
        scoreId = existingScore.id;
        finalScore = existingScore.score;
        isNewHighScore = false;
      }
    } else {
      // Insert new score
      const { data: inserted, error: insertError } = await supabase
        .from('scores')
        .insert({
          leaderboard_id: leaderboardId,
          player_guid,
          player_name,
          score,
          metadata: (metadata as any) || null,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      scoreId = inserted!.id;
      finalScore = score;
      isNewHighScore = true;
    }

    // Calculate rank (number of scores higher than this one + 1)
    const { count } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('leaderboard_id', leaderboardId)
      .gt('score', finalScore);

    const rank = (count ?? 0) + 1;

    return successResponse(
      {
        id: scoreId,
        player_guid,
        player_name,
        score: finalScore,
        rank,
        is_new_high_score: isNewHighScore,
      },
      200,
      corsHeaders
    );
  } catch (error) {
    console.error('Score submission error:', error);

    // Handle specific API key validation errors
    if (error instanceof Error) {
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
      'Failed to submit score',
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
