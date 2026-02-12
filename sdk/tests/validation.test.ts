/**
 * Unit tests for name validation.
 * No network required — pure function tests.
 */

import { describe, it, expect } from 'vitest';
import { validateName } from '../src/validation';

describe('validateName()', () => {
  describe('default options', () => {
    it('should uppercase and strip invalid characters', () => {
      expect(validateName('Ace Pilot!')).toBe('ACEPILOT');
    });

    it('should trim whitespace', () => {
      expect(validateName('  ACE  ')).toBe('ACE');
    });

    it('should allow underscores', () => {
      expect(validateName('ace_pilot')).toBe('ACE_PILOT');
    });

    it('should allow numbers', () => {
      expect(validateName('player123')).toBe('PLAYER123');
    });

    it('should truncate to 12 characters', () => {
      expect(validateName('verylongplayername')).toBe('VERYLONGPLAY');
    });

    it('should return null for names shorter than 2 chars after sanitization', () => {
      expect(validateName('x')).toBeNull();
      expect(validateName('!')).toBeNull();
      expect(validateName('  a  ')).toBeNull();
    });

    it('should accept exactly 2 characters', () => {
      expect(validateName('ab')).toBe('AB');
    });

    it('should handle empty string', () => {
      expect(validateName('')).toBeNull();
    });

    it('should handle whitespace-only string', () => {
      expect(validateName('   ')).toBeNull();
    });

    it('should strip emojis and special characters', () => {
      expect(validateName('🎮Player🎮')).toBe('PLAYER');
    });
  });

  describe('custom options', () => {
    it('should respect minLength', () => {
      expect(validateName('abc', { minLength: 5 })).toBeNull();
      expect(validateName('abcde', { minLength: 5 })).toBe('ABCDE');
    });

    it('should respect maxLength', () => {
      expect(validateName('abcdef', { maxLength: 4 })).toBe('ABCD');
    });

    it('should respect uppercase: false', () => {
      expect(validateName('AcePilot', { uppercase: false })).toBe('AcePilot');
    });

    it('should respect custom allowedPattern', () => {
      // Allow only lowercase letters
      const opts = { uppercase: false, allowedPattern: /[^a-z]/g };
      expect(validateName('AcePilot123', opts)).toBe('ceilot');
    });

    it('should combine multiple options', () => {
      const result = validateName('Hello World!', {
        minLength: 1,
        maxLength: 5,
        uppercase: true,
      });
      expect(result).toBe('HELLO');
    });
  });
});
