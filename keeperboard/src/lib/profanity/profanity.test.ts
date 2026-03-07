import { describe, it, expect } from 'vitest';
import { containsProfanity } from './index';

/**
 * Names that SHOULD be blocked (profanity).
 * Add new test cases here when discovered.
 *
 * Note: We use word boundaries (default) to prevent false positives like
 * "Assassin" being blocked. This means compound words like "FuckBoy" won't
 * be caught, but that's an acceptable trade-off.
 */
const SHOULD_BLOCK: string[] = [
  // Basic profanity (standalone words)
  'fuck',
  'shit',
  'bitch',
  'dick',
  'pussy',
  'cunt',

  // Leetspeak variants
  'f4ck',
  'sh1t',
  'b1tch',
  'd1ck',
  'pu55y',
  'c0ck',

  // Extended/repeated letters
  'fuuuck',
  'shiiit',
  'fuuuuuck',

  // With spaces (these should still be caught)
  'fuck you',
  'shit head',
];

/**
 * Names that should NOT be blocked (false positives).
 * Add names here that were incorrectly blocked.
 */
const SHOULD_ALLOW: string[] = [
  // Normal player names
  'Player1',
  'SkyKing',
  'AcePilot',
  'NightOwl',
  'DragonSlayer',
  'xXProGamerXx',
  'NoobMaster69',

  // Scunthorpe problem - words containing bad substrings
  'Scunthorpe',
  'Assassin',
  'Cockatoo',
  'Cockpit',
  'Dickens',
  'Hancock',
  'Peacock',
  'Shuttlecock',

  // Words with "ass" substring
  'Bassist',
  'Classic',
  'Compass',
  'Embassy',
  'Grass',
  'Mass',
  'Pass',
  'Class',
  'Massive',

  // Words with "tit" substring
  'Titanic',
  'Title',
  'Constitution',

  // Words with "cum" substring
  'Document',
  'Cucumber',
  'Circumstance',

  // Words with "hell" substring
  'Hello',
  'Shell',
  'Michelle',

  // Edge cases from real leaderboard
  'Bonjour',
  'IcyCobra81',
  'HyperPuma19',
  'MightyPira11',
];

describe('Profanity Filter', () => {
  describe('should BLOCK profane names', () => {
    SHOULD_BLOCK.forEach((name) => {
      it(`blocks "${name}"`, () => {
        expect(containsProfanity(name)).toBe(true);
      });
    });
  });

  describe('should ALLOW clean names', () => {
    SHOULD_ALLOW.forEach((name) => {
      it(`allows "${name}"`, () => {
        expect(containsProfanity(name)).toBe(false);
      });
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      expect(containsProfanity('')).toBe(false);
    });

    it('handles whitespace only', () => {
      expect(containsProfanity('   ')).toBe(false);
    });

    it('handles single character', () => {
      expect(containsProfanity('A')).toBe(false);
    });
  });
});
