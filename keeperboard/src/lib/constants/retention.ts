/**
 * Retention policy for archived leaderboard versions.
 * Defines how many historical versions to keep for each reset schedule type.
 * Older versions are automatically cleaned up during lazy reset operations.
 */

export const VERSION_RETENTION = {
  daily: 30, // Keep last 30 daily versions (~1 month)
  weekly: 12, // Keep last 12 weekly versions (~3 months)
  monthly: 12, // Keep last 12 monthly versions (~1 year)
} as const;
