import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, errorResponse } from '@/lib/utils/api-response';
import { corsHeaders } from '@/lib/utils/cors';

// Hardcoded leaderboard ID for skeleton testing
const TEST_LEADERBOARD_ID = '00000000-0000-0000-0000-000000000002';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = createAdminClient();

    // Get total count
    const { count: totalCount } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('leaderboard_id', TEST_LEADERBOARD_ID);

    // Get paginated scores sorted by score descending
    const { data: scores, error } = await supabase
      .from('scores')
      .select('player_guid, player_name, score')
      .eq('leaderboard_id', TEST_LEADERBOARD_ID)
      .order('score', { ascending: false })
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
      corsHeaders
    );
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
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
