/**
 * Unit tests for name generator.
 */

import { describe, it, expect } from 'vitest';
import { generatePlayerName } from '../src/nameGenerator';
import { validateName } from '../src/validation';

describe('generatePlayerName()', () => {
  it('should return AdjectiveNounNumber format', () => {
    const name = generatePlayerName();
    expect(name).toMatch(/^[A-Z][a-zA-Z]*[1-9]\d?$/);
  });

  it('should return string with length 4-12 chars (100 iterations)', () => {
    for (let i = 0; i < 100; i++) {
      const name = generatePlayerName();
      expect(name.length).toBeGreaterThanOrEqual(4);
      expect(name.length).toBeLessThanOrEqual(12);
    }
  });

  it('should contain only letters plus a 1-99 suffix (100 iterations)', () => {
    const pattern = /^[A-Z][a-zA-Z]*[1-9]\d?$/;
    for (let i = 0; i < 100; i++) {
      const name = generatePlayerName();
      expect(name).toMatch(pattern);
    }
  });

  it('should pass validateName() validation (100 iterations)', () => {
    for (let i = 0; i < 100; i++) {
      const name = generatePlayerName();
      // No options needed: validateName preserves case, and generated names are at most
      // 12 chars (MAX_BASE_LENGTH 10 + numeric suffix), matching the default maxLength.
      const validated = validateName(name);
      expect(validated).not.toBeNull();
      expect(validated).toBe(name);
    }
  });
});
