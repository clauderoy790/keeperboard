import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculatePeriodStart } from '@/lib/api/version';

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

    // Build query - include reset fields
    let query = supabase
      .from('leaderboards')
      .select('id, game_id, environment_id, name, sort_order, reset_schedule, reset_hour, current_version, current_period_start, created_at, updated_at')
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

    // Get score counts for each leaderboard (current version only for time-based boards)
    const leaderboardsWithCounts = await Promise.all(
      (leaderboards || []).map(async (leaderboard) => {
        let countQuery = supabase
          .from('scores')
          .select('*', { count: 'exact', head: true })
          .eq('leaderboard_id', leaderboard.id);

        // For time-based leaderboards, only count current version scores
        if (leaderboard.reset_schedule !== 'none') {
          countQuery = countQuery.eq('version', leaderboard.current_version);
        }

        const { count } = await countQuery;

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
    const { name, sort_order, environment_id, reset_schedule, reset_hour } = body;

    // Validate input
    if (!name || !sort_order || !environment_id) {
      return NextResponse.json(
        { error: 'Name, sort_order, and environment_id are required' },
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

    // Validate reset_schedule (default to 'none' if not provided)
    const validatedResetSchedule = reset_schedule || 'none';
    if (!['none', 'daily', 'weekly', 'monthly'].includes(validatedResetSchedule)) {
      return NextResponse.json(
        { error: 'Reset schedule must be one of: none, daily, weekly, monthly' },
        { status: 400 }
      );
    }

    // Validate reset_hour (default to 0 if not provided)
    const validatedResetHour = reset_hour !== undefined ? reset_hour : 0;
    if (!Number.isInteger(validatedResetHour) || validatedResetHour < 0 || validatedResetHour > 23) {
      return NextResponse.json(
        { error: 'Reset hour must be an integer between 0 and 23' },
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

    // Calculate current_period_start for time-based leaderboards
    let currentPeriodStart: string;
    if (validatedResetSchedule !== 'none') {
      // Align to proper period boundary (e.g., midnight UTC for daily, Monday for weekly, 1st of month for monthly)
      const periodStartDate = calculatePeriodStart(validatedResetSchedule, validatedResetHour, new Date());
      currentPeriodStart = periodStartDate.toISOString();
    } else {
      // For 'none' leaderboards, use current timestamp
      currentPeriodStart = new Date().toISOString();
    }

    // Create leaderboard
    const { data: leaderboard, error: createError } = await adminClient
      .from('leaderboards')
      .insert({
        game_id: gameId,
        environment_id,
        name,
        sort_order,
        reset_schedule: validatedResetSchedule,
        reset_hour: validatedResetHour,
        current_version: 1,
        current_period_start: currentPeriodStart,
      })
      .select()
      .single();

    if (createError) {
      if (createError.code === '23505') {
        // Unique constraint violation
        return NextResponse.json(
          {
            error:
              'A leaderboard with this name already exists in this environment',
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
