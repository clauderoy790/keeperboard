import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/games - List user's games with leaderboard counts
export async function GET() {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Fetch games with leaderboard counts
  const { data: games, error } = await supabase
    .from('games')
    .select(`
      id,
      name,
      description,
      created_at,
      leaderboards (count)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }

  // Transform the response to include leaderboard count
  const gamesWithCount = games?.map(game => ({
    id: game.id,
    name: game.name,
    description: game.description,
    created_at: game.created_at,
    leaderboard_count: Array.isArray(game.leaderboards) ? game.leaderboards.length : 0,
  })) || [];

  return NextResponse.json({ games: gamesWithCount });
}

// POST /api/games - Create new game
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { name, description } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for insert
    const adminSupabase = createAdminClient();

    // Insert game
    const { data: game, error } = await adminSupabase
      .from('games')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create game' },
        { status: 500 }
      );
    }

    const { error: envError } = await adminSupabase
      .from('environments')
      .upsert(
        {
          game_id: game.id,
          name: 'Production',
          is_default: true,
        },
        { onConflict: 'game_id,name' }
      );

    if (envError) {
      return NextResponse.json(
        { error: 'Failed to create default environment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
