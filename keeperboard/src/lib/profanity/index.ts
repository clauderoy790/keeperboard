/**
 * Profanity filter utility for player names.
 * Uses glin-profanity with aggressive leetspeak detection and whitelisting,
 * plus a manual substring check for words with no legitimate use in names.
 */
import { checkProfanity, type ProfanityCheckerConfig } from 'glin-profanity';
import { ALLOWED_WORDS } from './wordlists';

/**
 * Configuration for profanity checking.
 * - Aggressive leetspeak detection (f4ck, sh1t, etc.)
 * - Unicode normalization for homoglyph attacks
 * - Word boundaries ON to allow "Assassin", "Peacock", etc.
 */
const config: ProfanityCheckerConfig = {
  detectLeetspeak: true,
  leetspeakLevel: 'aggressive',
  normalizeUnicode: true,
  wordBoundaries: true, // Prevents false positives like "Assassin"
  ignoreWords: ALLOWED_WORDS.map(w => w.toLowerCase()),
  cacheResults: true,
  maxCacheSize: 500,
};

/**
 * Substrings that should ALWAYS be blocked, even when embedded.
 * These have no legitimate use in player names.
 * Checked separately since wordBoundaries can't catch them.
 */
const ALWAYS_BLOCK = [
  'nigger', 'nigga', 'n1gger', 'n1gga',
  'faggot', 'f4ggot', 'fag',
  'vagina', 'vag1na',
  'penis', 'pen1s',
  'chink', 'ch1nk',
  'kike', 'k1ke',
  'spic', 'sp1c',
  'wetback',
  'retard', 'r3tard',
];

/**
 * Check if a player name contains profanity.
 * Uses two-pass approach:
 * 1. Library check with word boundaries (catches "fuck", allows "Assassin")
 * 2. Manual substring check for slurs with no legitimate use
 *
 * @param name - The player name to check
 * @returns true if profanity detected, false otherwise
 */
export function containsProfanity(name: string): boolean {
  if (!name || name.trim().length === 0) {
    return false;
  }

  // Pass 1: Library check (handles leetspeak, word boundaries)
  const result = checkProfanity(name, config);
  if (result.containsProfanity) {
    return true;
  }

  // Pass 2: Check for always-blocked substrings (slurs, etc.)
  const lowerName = name.toLowerCase();
  return ALWAYS_BLOCK.some(bad => lowerName.includes(bad));
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
