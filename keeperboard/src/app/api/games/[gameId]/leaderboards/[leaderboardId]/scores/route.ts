import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveCurrentVersion } from '@/lib/api/version';

interface RouteParams {
  params: Promise<{ gameId: string; leaderboardId: string }>;
}

/**
 * GET /api/games/[gameId]/leaderboards/[leaderboardId]/scores
 * List scores with pagination, search, and sorting
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { gameId, leaderboardId } = await params;
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

    // Verify leaderboard exists and belongs to this game
    const { data: leaderboard } = await supabase
      .from('leaderboards')
      .select('id, sort_order, reset_schedule, reset_hour, current_version, current_period_start')
      .eq('id', leaderboardId)
      .eq('game_id', gameId)
      .single();

    if (!leaderboard) {
      return NextResponse.json(
        { error: 'Leaderboard not found' },
        { status: 404 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(
      parseInt(searchParams.get('pageSize') || '10'),
      100
    );
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'score';
    const sortOrder = searchParams.get('sortOrder') || leaderboard.sort_order;
    const versionParam = searchParams.get('version');

    const offset = (page - 1) * pageSize;

    // Determine which version to query
    let targetVersion: number;
    if (leaderboard.reset_schedule !== 'none') {
      // Resolve current version (may trigger lazy reset)
      const versionInfo = await resolveCurrentVersion({
        id: leaderboard.id,
        reset_schedule: leaderboard.reset_schedule,
        reset_hour: leaderboard.reset_hour,
        current_version: leaderboard.current_version,
        current_period_start: leaderboard.current_period_start,
      });

      // Use specified version or default to current
      targetVersion = versionParam ? parseInt(versionParam) : versionInfo.version;
    } else {
      // For 'none' leaderboards, always use version 1
      targetVersion = 1;
    }

    // Build query
    let query = supabase
      .from('scores')
      .select('id, player_guid, player_name, score, version, created_at, updated_at', {
        count: 'exact',
      })
      .eq('leaderboard_id', leaderboardId)
      .eq('version', targetVersion);

    // Apply search filter
    if (search) {
      query = query.or(
        `player_name.ilike.%${search}%,player_guid.ilike.%${search}%`
      );
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    switch (sortBy) {
      case 'player_name':
        query = query.order('player_name', { ascending });
        break;
      case 'created_at':
        query = query.order('created_at', { ascending });
        break;
      case 'score':
      default:
        query = query.order('score', { ascending: !ascending }); // Higher scores first by default
        break;
    }

    // Apply pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data: scores, error, count } = await query;

    if (error) {
      throw error;
    }

    // Calculate ranks for each score (within the same version)
    const scoresWithRanks = await Promise.all(
      (scores || []).map(async (score) => {
        const { count: higherCount } = await supabase
          .from('scores')
          .select('*', { count: 'exact', head: true })
          .eq('leaderboard_id', leaderboardId)
          .eq('version', targetVersion)
          .gt('score', score.score);

        return {
          ...score,
          rank: (higherCount ?? 0) + 1,
        };
      })
    );

    // Build response metadata
    const response: any = {
      scores: scoresWithRanks,
      pagination: {
        page,
        pageSize,
        totalCount: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      },
    };

    // Include version metadata for time-based leaderboards
    if (leaderboard.reset_schedule !== 'none') {
      response.version = targetVersion;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scores' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/games/[gameId]/leaderboards/[leaderboardId]/scores
 * Delete ALL scores for this leaderboard (reset)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { gameId, leaderboardId } = await params;
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
      .select('id, reset_schedule, current_version')
      .eq('id', leaderboardId)
      .eq('game_id', gameId)
      .single();

    if (!leaderboard) {
      return NextResponse.json(
        { error: 'Leaderboard not found' },
        { status: 404 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const allVersions = searchParams.get('all_versions') === 'true';

    // Build delete query
    let deleteQuery = supabase.from('scores').delete().eq('leaderboard_id', leaderboardId);

    // For time-based leaderboards, default to current version only unless all_versions is true
    if (leaderboard.reset_schedule !== 'none' && !allVersions) {
      deleteQuery = deleteQuery.eq('version', leaderboard.current_version);
    }

    // Get count before deletion
    let countQuery = supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .eq('leaderboard_id', leaderboardId);

    if (leaderboard.reset_schedule !== 'none' && !allVersions) {
      countQuery = countQuery.eq('version', leaderboard.current_version);
    }

    const { count: deletedCount } = await countQuery;

    // Delete scores
    const { error } = await deleteQuery;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      deletedCount: deletedCount ?? 0,
      deletedAllVersions: allVersions,
    });
  } catch (error) {
    console.error('Failed to reset leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to reset leaderboard' },
      { status: 500 }
    );
  }
}
