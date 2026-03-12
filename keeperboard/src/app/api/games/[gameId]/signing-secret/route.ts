import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateSigningSecret } from '@/lib/api/signature';

type Params = {
  params: Promise<{
    gameId: string;
  }>;
};

// GET /api/games/[gameId]/signing-secret - Get signing status (not the secret itself)
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

  const adminSupabase = createAdminClient();

  const { data: game, error } = await adminSupabase
    .from('games')
    .select('signing_enabled, signing_secret, score_cap, min_elapsed_seconds, user_id')
    .eq('id', gameId)
    .single();

  if (error || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  if (game.user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  return NextResponse.json({
    signing_enabled: game.signing_enabled,
    has_secret: !!game.signing_secret,
    score_cap: game.score_cap,
    min_elapsed_seconds: game.min_elapsed_seconds,
    // Only show secret if it exists - this is intentional for initial reveal
    signing_secret: game.signing_secret,
  });
}

// POST /api/games/[gameId]/signing-secret - Generate a new signing secret
export async function POST(request: NextRequest, { params }: Params) {
  const { gameId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminSupabase = createAdminClient();

  // Verify ownership
  const { data: game, error: fetchError } = await adminSupabase
    .from('games')
    .select('user_id, signing_secret')
    .eq('id', gameId)
    .single();

  if (fetchError || !game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  if (game.user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Generate new secret
  const newSecret = generateSigningSecret();

  const { error: updateError } = await adminSupabase
    .from('games')
    .update({ signing_secret: newSecret })
    .eq('id', gameId);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to generate secret' }, { status: 500 });
  }

  return NextResponse.json({
    signing_secret: newSecret,
    message: 'New signing secret generated. Save this now - it will be hidden after page reload.',
  });
}

// PUT /api/games/[gameId]/signing-secret - Enable/disable signing
export async function PUT(request: NextRequest, { params }: Params) {
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
    const body = await request.json();
    const { signing_enabled, score_cap, min_elapsed_seconds } = body;

    // Build update object
    const updateData: {
      signing_enabled?: boolean;
      score_cap?: number | null;
      min_elapsed_seconds?: number;
      signing_secret?: string;
    } = {};

    if (typeof signing_enabled === 'boolean') {
      updateData.signing_enabled = signing_enabled;
    }

    if (score_cap !== undefined) {
      updateData.score_cap = score_cap === '' || score_cap === null ? null : Number(score_cap);
    }

    if (min_elapsed_seconds !== undefined) {
      updateData.min_elapsed_seconds = Number(min_elapsed_seconds) || 5;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Verify ownership
    const { data: game, error: fetchError } = await adminSupabase
      .from('games')
      .select('user_id, signing_secret, signing_enabled, score_cap, min_elapsed_seconds')
      .eq('id', gameId)
      .single();

    if (fetchError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // If enabling signing but no secret exists, generate one
    let newSecret: string | undefined;
    if (updateData.signing_enabled && !game.signing_secret) {
      newSecret = generateSigningSecret();
      updateData.signing_secret = newSecret;
    }

    const { error: updateError } = await adminSupabase
      .from('games')
      .update(updateData)
      .eq('id', gameId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update anti-cheat settings' }, { status: 500 });
    }

    return NextResponse.json({
      signing_enabled: updateData.signing_enabled ?? game.signing_enabled,
      score_cap: updateData.score_cap ?? game.score_cap,
      min_elapsed_seconds: updateData.min_elapsed_seconds ?? game.min_elapsed_seconds,
      ...(newSecret && { signing_secret: newSecret }),
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
