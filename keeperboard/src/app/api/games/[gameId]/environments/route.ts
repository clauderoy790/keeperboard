import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/games/[gameId]/environments
 * List all environments for a game
 */
export async function GET(
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

    // Get all environments for this game
    const { data: environments, error: envsError } = await supabase
      .from('environments')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true });

    if (envsError) {
      throw new Error(envsError.message);
    }

    return NextResponse.json({ environments });
  } catch (error: any) {
    console.error('GET /api/games/[gameId]/environments error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch environments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/games/[gameId]/environments
 * Create a new environment for a game
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
    const { name } = body;

    // Validate input
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Use admin client for insert (bypasses RLS)
    const adminClient = createAdminClient();

    // Create environment
    const { data: environment, error: createError } = await adminClient
      .from('environments')
      .insert({
        game_id: gameId,
        name,
        is_default: false,
      })
      .select()
      .single();

    if (createError) {
      if (createError.code === '23505') {
        // Unique constraint violation
        return NextResponse.json(
          { error: 'An environment with this name already exists' },
          { status: 409 }
        );
      }
      throw new Error(createError.message);
    }

    return NextResponse.json({ environment }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/games/[gameId]/environments error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create environment' },
      { status: 500 }
    );
  }
}
