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

    // Get leaderboard
    const { data: leaderboard, error: leaderboardError } = await supabase
      .from('leaderboards')
      .select('*')
      .eq('id', leaderboardId)
      .eq('game_id', gameId)
      .single();

    if (leaderboardError || !leaderboard) {
      return NextResponse.json(
        { error: 'Leaderboard not found' },
        { status: 404 }
      );
    }

    // Get score count
    const { count } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('leaderboard_id', leaderboardId);

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
    const { name, slug, sort_order } = body;

    // Validate slug format if provided
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must be lowercase letters, numbers, and hyphens only' },
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

    // Build update object (only include provided fields)
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;
    if (sort_order !== undefined) updates.sort_order = sort_order;

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
              'A leaderboard with this slug already exists in this environment',
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
