import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ gameId: string; leaderboardId: string; scoreId: string }>;
}

/**
 * PUT /api/games/[gameId]/leaderboards/[leaderboardId]/scores/[scoreId]
 * Update a score (player name and/or score value)
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { gameId, leaderboardId, scoreId } = await params;
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this game
    const { data: game } = await supabase
      .from('games')
      .select('id')
      .eq('id', gameId)
      .eq('user_id', user.id)
      .single();

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Verify leaderboard exists
    const { data: leaderboard } = await supabase
      .from('leaderboards')
      .select('id')
      .eq('id', leaderboardId)
      .eq('game_id', gameId)
      .single();

    if (!leaderboard) {
      return NextResponse.json(
        { error: 'Leaderboard not found' },
        { status: 404 }
      );
    }

    // Verify score exists
    const { data: existingScore } = await supabase
      .from('scores')
      .select('id')
      .eq('id', scoreId)
      .eq('leaderboard_id', leaderboardId)
      .single();

    if (!existingScore) {
      return NextResponse.json({ error: 'Score not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { player_name, score } = body;

    // Validate
    if (player_name !== undefined && typeof player_name !== 'string') {
      return NextResponse.json(
        { error: 'player_name must be a string' },
        { status: 400 }
      );
    }
    if (score !== undefined && typeof score !== 'number') {
      return NextResponse.json(
        { error: 'score must be a number' },
        { status: 400 }
      );
    }

    // Build update object
    const updates: { player_name?: string; score?: number; updated_at: string } =
      {
        updated_at: new Date().toISOString(),
      };
    if (player_name !== undefined) updates.player_name = player_name;
    if (score !== undefined) updates.score = score;

    // Update score
    const { data: updatedScore, error } = await supabase
      .from('scores')
      .update(updates)
      .eq('id', scoreId)
      .select('id, player_guid, player_name, score, created_at, updated_at')
      .single();

    if (error) {
      throw error;
    }

    // Calculate new rank
    const { count: higherCount } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('leaderboard_id', leaderboardId)
      .gt('score', updatedScore.score);

    return NextResponse.json({
      score: {
        ...updatedScore,
        rank: (higherCount ?? 0) + 1,
      },
    });
  } catch (error) {
    console.error('Failed to update score:', error);
    return NextResponse.json(
      { error: 'Failed to update score' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/games/[gameId]/leaderboards/[leaderboardId]/scores/[scoreId]
 * Delete a single score
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { gameId, leaderboardId, scoreId } = await params;
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this game
    const { data: game } = await supabase
      .from('games')
      .select('id')
      .eq('id', gameId)
      .eq('user_id', user.id)
      .single();

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Verify leaderboard exists
    const { data: leaderboard } = await supabase
      .from('leaderboards')
      .select('id')
      .eq('id', leaderboardId)
      .eq('game_id', gameId)
      .single();

    if (!leaderboard) {
      return NextResponse.json(
        { error: 'Leaderboard not found' },
        { status: 404 }
      );
    }

    // Delete the score
    const { error } = await supabase
      .from('scores')
      .delete()
      .eq('id', scoreId)
      .eq('leaderboard_id', leaderboardId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete score:', error);
    return NextResponse.json(
      { error: 'Failed to delete score' },
      { status: 500 }
    );
  }
}
