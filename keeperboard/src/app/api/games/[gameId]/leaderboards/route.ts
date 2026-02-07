import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/games/[gameId]/leaderboards
 * List leaderboards for a game, filtered by environment_id query param
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const supabase = await createClient();

    // Get environment_id from query params
    const { searchParams } = new URL(request.url);
    const environmentId = searchParams.get('environment_id');

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id')
      .eq('id', gameId)
      .eq('user_id', user.id)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Build query
    let query = supabase
      .from('leaderboards')
      .select('*')
      .eq('game_id', gameId);

    // Filter by environment if provided
    if (environmentId) {
      query = query.eq('environment_id', environmentId);
    }

    // Order by created_at
    query = query.order('created_at', { ascending: true });

    const { data: leaderboards, error: leaderboardsError } = await query;

    if (leaderboardsError) {
      throw new Error(leaderboardsError.message);
    }

    // Get score counts for each leaderboard
    const leaderboardsWithCounts = await Promise.all(
      (leaderboards || []).map(async (leaderboard) => {
        const { count } = await supabase
          .from('scores')
          .select('*', { count: 'exact', head: true })
          .eq('leaderboard_id', leaderboard.id);

        return {
          ...leaderboard,
          score_count: count || 0,
        };
      })
    );

    return NextResponse.json({ leaderboards: leaderboardsWithCounts });
  } catch (error: any) {
    console.error('GET /api/games/[gameId]/leaderboards error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leaderboards' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/games/[gameId]/leaderboards
 * Create a new leaderboard (requires environment_id in body)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id')
      .eq('id', gameId)
      .eq('user_id', user.id)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { name, slug, sort_order, environment_id } = body;

    // Validate input
    if (!name || !slug || !sort_order || !environment_id) {
      return NextResponse.json(
        { error: 'Name, slug, sort_order, and environment_id are required' },
        { status: 400 }
      );
    }

    // Validate slug format (lowercase, hyphens only)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must be lowercase letters, numbers, and hyphens only' },
        { status: 400 }
      );
    }

    // Validate sort_order
    if (!['asc', 'desc'].includes(sort_order)) {
      return NextResponse.json(
        { error: 'Sort order must be "asc" or "desc"' },
        { status: 400 }
      );
    }

    // Verify environment belongs to this game
    const { data: environment } = await supabase
      .from('environments')
      .select('id')
      .eq('id', environment_id)
      .eq('game_id', gameId)
      .single();

    if (!environment) {
      return NextResponse.json(
        { error: 'Environment not found for this game' },
        { status: 404 }
      );
    }

    // Use admin client for insert (bypasses RLS)
    const adminClient = createAdminClient();

    // Create leaderboard
    const { data: leaderboard, error: createError } = await adminClient
      .from('leaderboards')
      .insert({
        game_id: gameId,
        environment_id,
        name,
        slug,
        sort_order,
      })
      .select()
      .single();

    if (createError) {
      if (createError.code === '23505') {
        // Unique constraint violation
        return NextResponse.json(
          {
            error:
              'A leaderboard with this slug already exists in this environment',
          },
          { status: 409 }
        );
      }
      throw new Error(createError.message);
    }

    return NextResponse.json({ leaderboard }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/games/[gameId]/leaderboards error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create leaderboard' },
      { status: 500 }
    );
  }
}
