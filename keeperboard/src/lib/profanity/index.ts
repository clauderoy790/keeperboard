/**
 * Profanity filter utility for player names.
 * Uses glin-profanity with aggressive leetspeak detection and whitelisting.
 */
import { checkProfanity, type ProfanityCheckerConfig } from 'glin-profanity';
import { ALLOWED_WORDS } from './wordlists';

/**
 * Configuration for profanity checking.
 * - Aggressive leetspeak detection (f4ck, sh1t, etc.)
 * - Unicode normalization for homoglyph attacks
 * - Whitelist for common false positives (Scunthorpe, Assassin, etc.)
 */
const config: ProfanityCheckerConfig = {
  detectLeetspeak: true,
  leetspeakLevel: 'aggressive',
  normalizeUnicode: true,
  ignoreWords: ALLOWED_WORDS.map(w => w.toLowerCase()),
  cacheResults: true,
  maxCacheSize: 500,
};

/**
 * Check if a player name contains profanity.
 * Returns true if profanity is detected.
 *
 * @param name - The player name to check
 * @returns true if profanity detected, false otherwise
 *
 * @example
 * containsProfanity('SkyKing')    // false
 * containsProfanity('f4ckYou')    // true
 * containsProfanity('Assassin')   // false (whitelisted)
 */
export function containsProfanity(name: string): boolean {
  if (!name || name.trim().length === 0) {
    return false;
  }

  const result = checkProfanity(name, config);
  return result.containsProfanity;
}

/**
 * Get the detected profane words from a name.
 * Useful for logging/debugging.
 *
 * @param name - The player name to check
 * @returns Array of detected profane words
 */
export function getDetectedProfanity(name: string): string[] {
  if (!name || name.trim().length === 0) {
    return [];
  }

  const result = checkProfanity(name, config);
  return result.profaneWords;
}
