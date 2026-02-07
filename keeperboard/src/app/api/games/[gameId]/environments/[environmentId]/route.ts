import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * PUT /api/games/[gameId]/environments/[environmentId]
 * Update an environment's name
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string; environmentId: string }> }
) {
  try {
    const { gameId, environmentId } = await params;
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
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Use admin client to update environment
    const adminClient = createAdminClient();

    const { data: environment, error: updateError } = await adminClient
      .from('environments')
      .update({ name })
      .eq('id', environmentId)
      .eq('game_id', gameId)
      .select()
      .single();

    if (updateError || !environment) {
      return NextResponse.json(
        { error: 'Environment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ environment });
  } catch (error: any) {
    console.error(
      'PUT /api/games/[gameId]/environments/[environmentId] error:',
      error
    );
    return NextResponse.json(
      { error: error.message || 'Failed to update environment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/games/[gameId]/environments/[environmentId]
 * Delete an environment (cascades to leaderboards and scores)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string; environmentId: string }> }
) {
  try {
    const { gameId, environmentId } = await params;
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

    // Check if this is the default environment
    const { data: environment } = await supabase
      .from('environments')
      .select('is_default')
      .eq('id', environmentId)
      .eq('game_id', gameId)
      .single();

    if (environment?.is_default) {
      return NextResponse.json(
        { error: 'Cannot delete the default environment' },
        { status: 400 }
      );
    }

    // Use admin client to delete environment (cascades to leaderboards and scores)
    const adminClient = createAdminClient();

    const { error: deleteError } = await adminClient
      .from('environments')
      .delete()
      .eq('id', environmentId)
      .eq('game_id', gameId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(
      'DELETE /api/games/[gameId]/environments/[environmentId] error:',
      error
    );
    return NextResponse.json(
      { error: error.message || 'Failed to delete environment' },
      { status: 500 }
    );
  }
}
