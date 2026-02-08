import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/games/[gameId]/leaderboards/[leaderboardId]
 * Get leaderboard details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string; leaderboardId: string }> }
) {
  try {
    const { gameId, leaderboardId } = await params;
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

    // Get leaderboard with reset fields
    const { data: leaderboard, error: leaderboardError } = await supabase
      .from('leaderboards')
      .select('id, game_id, environment_id, name, sort_order, reset_schedule, reset_hour, current_version, current_period_start, created_at, updated_at')
      .eq('id', leaderboardId)
      .eq('game_id', gameId)
      .single();

    if (leaderboardError || !leaderboard) {
      return NextResponse.json(
        { error: 'Leaderboard not found' },
        { status: 404 }
      );
    }

    // Get score count (current version only for time-based boards)
    let countQuery = supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('leaderboard_id', leaderboardId);

    if (leaderboard.reset_schedule !== 'none') {
      countQuery = countQuery.eq('version', leaderboard.current_version);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      leaderboard: {
        ...leaderboard,
        score_count: count || 0,
      },
    });
  } catch (error: any) {
    console.error(
      'GET /api/games/[gameId]/leaderboards/[leaderboardId] error:',
      error
    );
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/games/[gameId]/leaderboards/[leaderboardId]
 * Update leaderboard
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string; leaderboardId: string }> }
) {
  try {
    const { gameId, leaderboardId } = await params;
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
    const { name, sort_order, reset_schedule, reset_hour } = body;

    // Get current leaderboard to check reset_schedule immutability
    const { data: currentLeaderboard } = await supabase
      .from('leaderboards')
      .select('reset_schedule')
      .eq('id', leaderboardId)
      .eq('game_id', gameId)
      .single();

    if (!currentLeaderboard) {
      return NextResponse.json(
        { error: 'Leaderboard not found' },
        { status: 404 }
      );
    }

    // Check if reset_schedule is being changed (immutable after creation)
    if (reset_schedule !== undefined && reset_schedule !== currentLeaderboard.reset_schedule) {
      return NextResponse.json(
        { error: 'Cannot change reset schedule after creation. Create a new leaderboard instead.' },
        { status: 400 }
      );
    }

    // Validate sort_order if provided
    if (sort_order && !['asc', 'desc'].includes(sort_order)) {
      return NextResponse.json(
        { error: 'Sort order must be "asc" or "desc"' },
        { status: 400 }
      );
    }

    // Validate reset_hour if provided (only meaningful if schedule !== 'none')
    if (reset_hour !== undefined) {
      if (!Number.isInteger(reset_hour) || reset_hour < 0 || reset_hour > 23) {
        return NextResponse.json(
          { error: 'Reset hour must be an integer between 0 and 23' },
          { status: 400 }
        );
      }
    }

    // Build update object (only include provided fields)
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (reset_hour !== undefined) updates.reset_hour = reset_hour;

    // Use admin client to update leaderboard
    const adminClient = createAdminClient();

    const { data: leaderboard, error: updateError } = await adminClient
      .from('leaderboards')
      .update(updates)
      .eq('id', leaderboardId)
      .eq('game_id', gameId)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === '23505') {
        return NextResponse.json(
          {
            error:
              'A leaderboard with this name already exists in this environment',
          },
          { status: 409 }
        );
      }
      throw new Error(updateError.message);
    }

    if (!leaderboard) {
      return NextResponse.json(
        { error: 'Leaderboard not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ leaderboard });
  } catch (error: any) {
    console.error(
      'PUT /api/games/[gameId]/leaderboards/[leaderboardId] error:',
      error
    );
    return NextResponse.json(
      { error: error.message || 'Failed to update leaderboard' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/games/[gameId]/leaderboards/[leaderboardId]
 * Delete leaderboard (cascades to scores)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string; leaderboardId: string }> }
) {
  try {
    const { gameId, leaderboardId } = await params;
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

    // Use admin client to delete leaderboard (cascades to scores)
    const adminClient = createAdminClient();

    const { error: deleteError } = await adminClient
      .from('leaderboards')
      .delete()
      .eq('id', leaderboardId)
      .eq('game_id', gameId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(
      'DELETE /api/games/[gameId]/leaderboards/[leaderboardId] error:',
      error
    );
    return NextResponse.json(
      { error: error.message || 'Failed to delete leaderboard' },
      { status: 500 }
    );
  }
}
