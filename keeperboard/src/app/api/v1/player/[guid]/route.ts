import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { corsHeaders } from '@/lib/utils/cors';

// Hardcoded leaderboard ID for skeleton testing
const TEST_LEADERBOARD_ID = '00000000-0000-0000-0000-000000000002';

interface RouteParams {
  params: Promise<{ guid: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { guid } = await params;
    const supabase = createAdminClient();

    // Get player's score
    const { data: playerScore, error } = await supabase
      .from('scores')
      .select('id, player_guid, player_name, score')
      .eq('leaderboard_id', TEST_LEADERBOARD_ID)
      .eq('player_guid', guid)
      .single();

    if (error || !playerScore) {
      return errorResponse(
        'Player not found',
        'NOT_FOUND',
        404,
        corsHeaders
      );
    }

    // Calculate rank
    const { count } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('leaderboard_id', TEST_LEADERBOARD_ID)
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
      corsHeaders
    );
  } catch (error) {
    console.error('Player fetch error:', error);
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

    // Get existing score
    const { data: existingScore, error: fetchError } = await supabase
      .from('scores')
      .select('id, score')
      .eq('leaderboard_id', TEST_LEADERBOARD_ID)
      .eq('player_guid', guid)
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

    // Calculate rank
    const { count } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('leaderboard_id', TEST_LEADERBOARD_ID)
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
      corsHeaders
    );
  } catch (error) {
    console.error('Player update error:', error);
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
