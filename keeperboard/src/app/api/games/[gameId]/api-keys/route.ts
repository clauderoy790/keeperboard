import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

type Params = {
  params: Promise<{
    gameId: string;
  }>;
};

// Generate a random API key with format: kb_{env_id_prefix}_{48_random_chars}
function generateApiKey(environmentId: string): {
  key: string;
  hash: string;
  prefix: string;
} {
  const randomBytes = crypto.randomBytes(36);
  const randomString = randomBytes
    .toString('base64')
    .replace(/\+/g, '')
    .replace(/\//g, '')
    .replace(/=/g, '')
    .substring(0, 48);

  const envPrefix = environmentId.replace(/-/g, '').slice(0, 8);
  const key = `kb_${envPrefix}_${randomString}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = `kb_${envPrefix}_`;

  return { key, hash, prefix };
}

// GET /api/games/[gameId]/api-keys - List existing API keys
export async function GET(request: NextRequest, { params }: Params) {
  const { gameId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminSupabase = createAdminClient();

    // Verify game ownership
    const { data: game } = await adminSupabase
      .from('games')
      .select('user_id')
      .eq('id', gameId)
      .single();

    if (!game || game.user_id !== user.id) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Get all API keys for this game (never return the hash)
    const { data: apiKeys, error } = await adminSupabase
      .from('api_keys')
      .select('id, game_id, environment_id, key_prefix, last_used_at, created_at')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ api_keys: apiKeys || [] });
  } catch (error: any) {
    console.error('GET /api/games/[gameId]/api-keys error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// POST /api/games/[gameId]/api-keys - Generate new API key
export async function POST(request: NextRequest, { params }: Params) {
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
    const { environment_id } = body;

    // Validate environment_id
    if (!environment_id) {
      return NextResponse.json(
        { error: 'environment_id is required' },
        { status: 400 }
      );
    }

    // Use admin client
    const adminSupabase = createAdminClient();

    // Verify game ownership
    const { data: game } = await adminSupabase
      .from('games')
      .select('user_id')
      .eq('id', gameId)
      .single();

    if (!game || game.user_id !== user.id) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Verify environment belongs to this game
    const { data: environment } = await adminSupabase
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

    // Delete existing key for this environment if one exists (regenerate flow)
    await adminSupabase
      .from('api_keys')
      .delete()
      .eq('game_id', gameId)
      .eq('environment_id', environment_id);

    // Generate new API key
    const { key, hash, prefix } = generateApiKey(environment.id);

    // Insert API key
    const { data: apiKey, error } = await adminSupabase
      .from('api_keys')
      .insert({
        game_id: gameId,
        environment_id,
        key_hash: hash,
        key_prefix: prefix,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Return the plain key (shown only once!)
    return NextResponse.json(
      {
        api_key: {
          ...apiKey,
          key, // Plain key returned only on creation
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/games/[gameId]/api-keys error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create API key' },
      { status: 500 }
    );
  }
}

// DELETE /api/games/[gameId]/api-keys - Revoke API key
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

  try {
    const body = await request.json();
    const { environment_id } = body;

    // Validate environment_id
    if (!environment_id) {
      return NextResponse.json(
        { error: 'environment_id is required' },
        { status: 400 }
      );
    }

    // Use admin client
    const adminSupabase = createAdminClient();

    // Verify game ownership
    const { data: game } = await adminSupabase
      .from('games')
      .select('user_id')
      .eq('id', gameId)
      .single();

    if (!game || game.user_id !== user.id) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Delete API key
    const { error } = await adminSupabase
      .from('api_keys')
      .delete()
      .eq('game_id', gameId)
      .eq('environment_id', environment_id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/games/[gameId]/api-keys error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
