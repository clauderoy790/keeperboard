/**
 * Version resolution engine for time-based leaderboards.
 * Implements "lazy reset": checks if current period has elapsed and advances version if so.
 * For 'none' (all-time) leaderboards, always returns version 1 with no reset info.
 *
 * Also handles automatic cleanup of old archived versions based on retention policy.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { VERSION_RETENTION } from '@/lib/constants/retention';

export interface VersionResolution {
  version: number;
  periodStart: string | null; // null for 'none' leaderboards
  nextReset: string | null; // null for 'none' leaderboards
}

interface Leaderboard {
  id: string;
  reset_schedule: string;
  reset_hour: number;
  current_version: number;
  current_period_start: string;
}

/**
 * Resolves the current version for a leaderboard, performing lazy reset if needed.
 * For 'none' leaderboards, always returns version 1 with no reset info.
 */
export async function resolveCurrentVersion(
  leaderboard: Leaderboard
): Promise<VersionResolution> {
  // Handle 'none' (all-time) leaderboards immediately
  if (leaderboard.reset_schedule === 'none') {
    return {
      version: 1,
      periodStart: null,
      nextReset: null,
    };
  }

  const now = new Date();
  const periodEnd = calculateNextReset(
    leaderboard.reset_schedule,
    leaderboard.reset_hour,
    leaderboard.current_period_start
  );

  // Current period still active
  if (now < periodEnd) {
    return {
      version: leaderboard.current_version,
      periodStart: leaderboard.current_period_start,
      nextReset: periodEnd.toISOString(),
    };
  }

  // Period has elapsed - calculate how many periods passed
  const periodsElapsed = calculatePeriodsElapsed(
    leaderboard.reset_schedule,
    leaderboard.reset_hour,
    leaderboard.current_period_start,
    now
  );

  const newVersion = leaderboard.current_version + periodsElapsed;
  const newPeriodStart = calculatePeriodStart(
    leaderboard.reset_schedule,
    leaderboard.reset_hour,
    now
  );

  // Update the leaderboard with optimistic locking
  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from('leaderboards')
    .update({
      current_version: newVersion,
      current_period_start: newPeriodStart.toISOString(),
    })
    .eq('id', leaderboard.id)
    .eq('current_version', leaderboard.current_version) // Optimistic lock
    .select()
    .single();

  // If 0 rows updated (race condition), re-read and return the winner's version
  if (error || !updated) {
    const { data: refetched } = await admin
      .from('leaderboards')
      .select('current_version, current_period_start, reset_schedule, reset_hour')
      .eq('id', leaderboard.id)
      .single();

    if (refetched) {
      const nextReset = calculateNextReset(
        refetched.reset_schedule,
        refetched.reset_hour,
        refetched.current_period_start
      );
      return {
        version: refetched.current_version,
        periodStart: refetched.current_period_start,
        nextReset: nextReset.toISOString(),
      };
    }
  }

  // Clean up old archived versions based on retention policy
  await cleanupOldVersions(leaderboard.id, newVersion, leaderboard.reset_schedule);

  const nextReset = calculateNextReset(
    leaderboard.reset_schedule,
    leaderboard.reset_hour,
    newPeriodStart.toISOString()
  );

  return {
    version: newVersion,
    periodStart: newPeriodStart.toISOString(),
    nextReset: nextReset.toISOString(),
  };
}

/**
 * Calculates the start timestamp of the period that referenceDate falls within.
 */
export function calculatePeriodStart(
  resetSchedule: string,
  resetHour: number,
  referenceDate: Date
): Date {
  const refUtc = new Date(referenceDate);

  if (resetSchedule === 'daily') {
    // Same day at resetHour:00:00 UTC
    const periodStart = new Date(
      Date.UTC(
        refUtc.getUTCFullYear(),
        refUtc.getUTCMonth(),
        refUtc.getUTCDate(),
        resetHour,
        0,
        0,
        0
      )
    );

    // If referenceDate is before resetHour, it belongs to previous day
    if (refUtc < periodStart) {
      periodStart.setUTCDate(periodStart.getUTCDate() - 1);
    }

    return periodStart;
  }

  if (resetSchedule === 'weekly') {
    // Monday of that week at resetHour:00:00 UTC
    const dayOfWeek = refUtc.getUTCDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert Sunday=0 to 6 days from Monday

    const monday = new Date(
      Date.UTC(
        refUtc.getUTCFullYear(),
        refUtc.getUTCMonth(),
        refUtc.getUTCDate() - daysFromMonday,
        resetHour,
        0,
        0,
        0
      )
    );

    // If it's Monday but before resetHour, belongs to previous week
    if (refUtc < monday) {
      monday.setUTCDate(monday.getUTCDate() - 7);
    }

    return monday;
  }

  if (resetSchedule === 'monthly') {
    // First day of that month at resetHour:00:00 UTC
    const periodStart = new Date(
      Date.UTC(refUtc.getUTCFullYear(), refUtc.getUTCMonth(), 1, resetHour, 0, 0, 0)
    );

    // If referenceDate is the 1st but before resetHour, belongs to previous month
    if (refUtc < periodStart) {
      periodStart.setUTCMonth(periodStart.getUTCMonth() - 1);
    }

    return periodStart;
  }

  throw new Error(`Unsupported reset schedule: ${resetSchedule}`);
}

/**
 * Calculates the timestamp when the current period ends (= next period start).
 */
export function calculateNextReset(
  resetSchedule: string,
  resetHour: number,
  periodStart: string
): Date {
  const start = new Date(periodStart);

  if (resetSchedule === 'daily') {
    const next = new Date(start);
    next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }

  if (resetSchedule === 'weekly') {
    const next = new Date(start);
    next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }

  if (resetSchedule === 'monthly') {
    const next = new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth() + 1,
        1,
        resetHour,
        0,
        0,
        0
      )
    );
    return next;
  }

  throw new Error(`Unsupported reset schedule: ${resetSchedule}`);
}

/**
 * Calculates the periodStart timestamp for a specific target version.
 * Uses math based on current version and period start to calculate backwards.
 */
export function calculatePeriodStartForVersion(
  leaderboard: Leaderboard,
  targetVersion: number
): string {
  if (targetVersion > leaderboard.current_version) {
    throw new Error('Target version cannot be greater than current version');
  }

  if (targetVersion === leaderboard.current_version) {
    return leaderboard.current_period_start;
  }

  const versionDiff = leaderboard.current_version - targetVersion;
  const currentStart = new Date(leaderboard.current_period_start);

  if (leaderboard.reset_schedule === 'daily') {
    const targetStart = new Date(currentStart);
    targetStart.setUTCDate(targetStart.getUTCDate() - versionDiff);
    return targetStart.toISOString();
  }

  if (leaderboard.reset_schedule === 'weekly') {
    const targetStart = new Date(currentStart);
    targetStart.setUTCDate(targetStart.getUTCDate() - versionDiff * 7);
    return targetStart.toISOString();
  }

  if (leaderboard.reset_schedule === 'monthly') {
    const targetStart = new Date(currentStart);
    targetStart.setUTCMonth(targetStart.getUTCMonth() - versionDiff);
    return targetStart.toISOString();
  }

  throw new Error(`Unsupported reset schedule: ${leaderboard.reset_schedule}`);
}

/**
 * Helper: Calculate how many complete periods have elapsed since periodStart.
 */
function calculatePeriodsElapsed(
  resetSchedule: string,
  resetHour: number,
  periodStartStr: string,
  now: Date
): number {
  const periodStart = new Date(periodStartStr);
  let count = 0;
  let currentPeriodEnd = calculateNextReset(resetSchedule, resetHour, periodStartStr);

  // Count how many full periods have passed
  while (now >= currentPeriodEnd) {
    count++;
    const nextStart = currentPeriodEnd.toISOString();
    currentPeriodEnd = calculateNextReset(resetSchedule, resetHour, nextStart);
  }

  return count;
}

/**
 * Cleans up old archived versions based on retention policy.
 * Called during lazy reset when a new version is created.
 *
 * @param leaderboardId - The leaderboard to clean up
 * @param currentVersion - The new current version number
 * @param resetSchedule - The reset schedule type (determines retention limit)
 */
async function cleanupOldVersions(
  leaderboardId: string,
  currentVersion: number,
  resetSchedule: string
): Promise<void> {
  // Get retention limit for this schedule type
  const retentionLimit =
    VERSION_RETENTION[resetSchedule as keyof typeof VERSION_RETENTION];

  // If no retention limit (e.g., 'none' schedule), don't delete anything
  if (!retentionLimit) {
    return;
  }

  // Calculate oldest version to keep
  const oldestAllowedVersion = currentVersion - retentionLimit;

  // No cleanup needed if we're within retention limits
  if (oldestAllowedVersion <= 1) {
    return;
  }

  // Delete all scores older than the retention limit
  const admin = createAdminClient();
  await admin
    .from('scores')
    .delete()
    .eq('leaderboard_id', leaderboardId)
    .lt('version', oldestAllowedVersion);

  // No need to check error - deletion is best-effort
  // If it fails, cleanup will be attempted again on next reset
}
