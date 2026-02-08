import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveCurrentVersion } from '@/lib/api/version';

interface RouteParams {
  params: Promise<{ gameId: string; leaderboardId: string }>;
}

interface ImportScore {
  player_name: string;
  score: number;
  player_guid?: string;
}

/**
 * POST /api/games/[gameId]/leaderboards/[leaderboardId]/import
 * Batch import scores from CSV/JSON
 */
export async function POST(request: Request, { params }: RouteParams) {
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

    // Verify leaderboard exists and get reset info
    const { data: leaderboard } = await supabase
      .from('leaderboards')
      .select('id, reset_schedule, reset_hour, current_version, current_period_start')
      .eq('id', leaderboardId)
      .eq('game_id', gameId)
      .single();

    if (!leaderboard) {
      return NextResponse.json(
        { error: 'Leaderboard not found' },
        { status: 404 }
      );
    }

    // Resolve current version (may trigger lazy reset)
    let currentVersion = 1;
    if (leaderboard.reset_schedule !== 'none') {
      const versionInfo = await resolveCurrentVersion({
        id: leaderboard.id,
        reset_schedule: leaderboard.reset_schedule,
        reset_hour: leaderboard.reset_hour,
        current_version: leaderboard.current_version,
        current_period_start: leaderboard.current_period_start,
      });
      currentVersion = versionInfo.version;
    }

    // Parse request body
    const body = await request.json();
    const { scores, duplicateHandling, importSource } = body as {
      scores: ImportScore[];
      duplicateHandling: 'skip' | 'update';
      importSource: 'csv' | 'json';
    };

    if (!Array.isArray(scores) || scores.length === 0) {
      return NextResponse.json(
        { error: 'Invalid scores array' },
        { status: 400 }
      );
    }

    // Validate each score
    for (const score of scores) {
      if (
        typeof score.player_name !== 'string' ||
        score.player_name.trim() === ''
      ) {
        return NextResponse.json(
          { error: 'Each score must have a valid player_name' },
          { status: 400 }
        );
      }
      if (typeof score.score !== 'number' || isNaN(score.score)) {
        return NextResponse.json(
          { error: 'Each score must have a valid score number' },
          { status: 400 }
        );
      }
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each score
    for (const scoreData of scores) {
      try {
        // Check if player already exists (by player_guid or player_name)
        let existingScore = null;

        if (scoreData.player_guid) {
          const { data } = await supabase
            .from('scores')
            .select('id, score')
            .eq('leaderboard_id', leaderboardId)
            .eq('player_guid', scoreData.player_guid)
            .eq('version', currentVersion)
            .maybeSingle();
          existingScore = data;
        }

        // If no match by GUID, try matching by name (for migrated scores without GUID)
        if (!existingScore) {
          const { data } = await supabase
            .from('scores')
            .select('id, score')
            .eq('leaderboard_id', leaderboardId)
            .eq('player_name', scoreData.player_name)
            .eq('version', currentVersion)
            .is('player_guid', null)
            .maybeSingle();
          existingScore = data;
        }

        if (existingScore) {
          if (duplicateHandling === 'skip') {
            skipCount++;
            continue;
          } else {
            // Update existing score
            const { error } = await supabase
              .from('scores')
              .update({
                score: scoreData.score,
                player_name: scoreData.player_name,
                is_migrated: true,
                migrated_from: importSource,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingScore.id);

            if (error) {
              throw error;
            }
            successCount++;
          }
        } else {
          // Insert new score with current version
          const { error } = await supabase.from('scores').insert({
            leaderboard_id: leaderboardId,
            player_guid: scoreData.player_guid || null,
            player_name: scoreData.player_name,
            score: scoreData.score,
            version: currentVersion,
            is_migrated: true,
            migrated_from: importSource,
          });

          if (error) {
            throw error;
          }
          successCount++;
        }
      } catch (error: any) {
        errorCount++;
        errors.push(
          `Error importing score for ${scoreData.player_name}: ${error.message}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      successCount,
      skipCount,
      errorCount,
      errors: errors.slice(0, 10), // Limit error messages to first 10
      totalProcessed: scores.length,
    });
  } catch (error) {
    console.error('Failed to import scores:', error);
    return NextResponse.json(
      { error: 'Failed to import scores' },
      { status: 500 }
    );
  }
}
