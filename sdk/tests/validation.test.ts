/**
 * Unit tests for name validation.
 * No network required — pure function tests.
 */

import { describe, it, expect } from 'vitest';
import { validateName } from '../src/validation';

describe('validateName()', () => {
  describe('default options', () => {
    it('should strip invalid characters', () => {
      expect(validateName('Ace Pilot!')).toBe('AcePilot');
    });

    it('should trim whitespace', () => {
      expect(validateName('  ACE  ')).toBe('ACE');
    });

    it('should allow underscores', () => {
      expect(validateName('ace_pilot')).toBe('ace_pilot');
    });

    it('should allow numbers', () => {
      expect(validateName('player123')).toBe('player123');
    });

    it('should truncate to 12 characters', () => {
      expect(validateName('verylongplayername')).toBe('verylongplay');
    });

    it('should return null for names shorter than 2 chars after sanitization', () => {
      expect(validateName('x')).toBeNull();
      expect(validateName('!')).toBeNull();
      expect(validateName('  a  ')).toBeNull();
    });

    it('should accept exactly 2 characters', () => {
      expect(validateName('ab')).toBe('ab');
    });

    it('should handle empty string', () => {
      expect(validateName('')).toBeNull();
    });

    it('should handle whitespace-only string', () => {
      expect(validateName('   ')).toBeNull();
    });

    it('should strip emojis and special characters', () => {
      expect(validateName('🎮Player🎮')).toBe('Player');
    });

    it('should preserve case', () => {
      expect(validateName('CamelCase')).toBe('CamelCase');
      expect(validateName('lowercase')).toBe('lowercase');
      expect(validateName('UPPERCASE')).toBe('UPPERCASE');
    });
  });

  describe('custom options', () => {
    it('should respect minLength', () => {
      expect(validateName('abc', { minLength: 5 })).toBeNull();
      expect(validateName('abcde', { minLength: 5 })).toBe('abcde');
    });

    it('should respect maxLength', () => {
      expect(validateName('abcdef', { maxLength: 4 })).toBe('abcd');
    });

    it('should respect custom allowedPattern', () => {
      // Allow only lowercase letters
      const opts = { allowedPattern: /[^a-z]/g };
      expect(validateName('AcePilot123', opts)).toBe('ceilot');
    });

    it('should combine multiple options', () => {
      const result = validateName('Hello World!', {
        minLength: 1,
        maxLength: 5,
      });
      expect(result).toBe('Hello');
    });
  });
});
