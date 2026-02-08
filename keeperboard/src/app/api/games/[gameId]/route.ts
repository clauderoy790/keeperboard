import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = {
  params: Promise<{
    gameId: string;
  }>;
};

// GET /api/games/[gameId] - Get game details
export async function GET(request: NextRequest, { params }: Params) {
  const { gameId } = await params;
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Fetch game
  const { data: game, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .eq('user_id', user.id)
    .single();

  if (error || !game) {
    return NextResponse.json(
      { error: 'Game not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ game });
}

// PUT /api/games/[gameId] - Update game
export async function PUT(request: NextRequest, { params }: Params) {
  const { gameId } = await params;
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

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient();

    // Verify ownership before update
    const { data: existingGame } = await adminSupabase
      .from('games')
      .select('user_id')
      .eq('id', gameId)
      .single();

    if (!existingGame || existingGame.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Update game
    const { data: game, error } = await adminSupabase
      .from('games')
      .update({
        ...(name && { name }),
        ...(description !== undefined && { description }),
      })
      .eq('id', gameId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update game' },
        { status: 500 }
      );
    }

    return NextResponse.json({ game });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// DELETE /api/games/[gameId] - Delete game
export async function DELETE(request: NextRequest, { params }: Params) {
  const { gameId } = await params;
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Use admin client to bypass RLS
  const adminSupabase = createAdminClient();

  // Verify ownership before delete
  const { data: existingGame } = await adminSupabase
    .from('games')
    .select('user_id')
    .eq('id', gameId)
    .single();

  if (!existingGame || existingGame.user_id !== user.id) {
    return NextResponse.json(
      { error: 'Game not found' },
      { status: 404 }
    );
  }

  // Delete game (cascading deletes will handle related records)
  const { error } = await adminSupabase
    .from('games')
    .delete()
    .eq('id', gameId);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to delete game' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
