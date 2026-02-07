import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

type Params = {
  params: Promise<{
    gameId: string;
  }>;
};

// Generate a random API key with format: kb_{env}_{48_random_chars}
function generateApiKey(environment: 'dev' | 'prod'): { key: string; hash: string; prefix: string } {
  const randomBytes = crypto.randomBytes(36);
  const randomString = randomBytes.toString('base64')
    .replace(/\+/g, '')
    .replace(/\//g, '')
    .replace(/=/g, '')
    .substring(0, 48);

  const key = `kb_${environment}_${randomString}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = `kb_${environment}_`;

  return { key, hash, prefix };
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
    const { environment } = body;

    // Validate environment
    if (environment !== 'dev' && environment !== 'prod') {
      return NextResponse.json(
        { error: 'Environment must be "dev" or "prod"' },
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
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Check if key already exists for this environment
    const { data: existingKey } = await adminSupabase
      .from('api_keys')
      .select('id')
      .eq('game_id', gameId)
      .eq('environment', environment)
      .single();

    if (existingKey) {
      return NextResponse.json(
        { error: `API key for ${environment} environment already exists. Delete it first to regenerate.` },
        { status: 409 }
      );
    }

    // Generate new API key
    const { key, hash, prefix } = generateApiKey(environment);

    // Insert API key
    const { data: apiKey, error } = await adminSupabase
      .from('api_keys')
      .insert({
        game_id: gameId,
        environment,
        key_hash: hash,
        key_prefix: prefix,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create API key' },
        { status: 500 }
      );
    }

    // Return the plain key (shown only once!)
    return NextResponse.json({
      api_key: {
        ...apiKey,
        key, // Plain key returned only on creation
      }
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
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
    const { environment } = body;

    // Validate environment
    if (environment !== 'dev' && environment !== 'prod') {
      return NextResponse.json(
        { error: 'Environment must be "dev" or "prod"' },
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
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Delete API key
    const { error } = await adminSupabase
      .from('api_keys')
      .delete()
      .eq('game_id', gameId)
      .eq('environment', environment);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
