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
      slug,
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
    slug: game.slug,
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
    const { name, slug, description } = body;

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Validate slug format (lowercase, hyphens only)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must be lowercase alphanumeric with hyphens only' },
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
        slug,
        description: description || null,
      })
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A game with this slug already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create game' },
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
