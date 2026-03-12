import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateSigningSecret,
  generateSignature,
  validateSignature,
  validateTimestamp,
} from './signature';

describe('Signature Utilities', () => {
  describe('generateSigningSecret', () => {
    it('should generate a base64 encoded string', () => {
      const secret = generateSigningSecret();
      expect(secret).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should generate unique secrets each time', () => {
      const secret1 = generateSigningSecret();
      const secret2 = generateSigningSecret();
      expect(secret1).not.toBe(secret2);
    });

    it('should generate secrets of appropriate length (32 bytes = ~44 chars base64)', () => {
      const secret = generateSigningSecret();
      expect(secret.length).toBeGreaterThanOrEqual(40);
      expect(secret.length).toBeLessThanOrEqual(48);
    });
  });

  describe('generateSignature', () => {
    const testSecret = 'test-secret-key-for-testing-purposes-123';

    it('should generate consistent signatures for same params', () => {
      const params = {
        playerGuid: 'player-123',
        timestamp: 1234567890000,
      };

      const sig1 = generateSignature(params, testSecret);
      const sig2 = generateSignature(params, testSecret);

      expect(sig1).toBe(sig2);
    });

    it('should generate different signatures for different player GUIDs', () => {
      const params1 = { playerGuid: 'player-123', timestamp: 1234567890000 };
      const params2 = { playerGuid: 'player-456', timestamp: 1234567890000 };

      const sig1 = generateSignature(params1, testSecret);
      const sig2 = generateSignature(params2, testSecret);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different timestamps', () => {
      const params1 = { playerGuid: 'player-123', timestamp: 1234567890000 };
      const params2 = { playerGuid: 'player-123', timestamp: 1234567890001 };

      const sig1 = generateSignature(params1, testSecret);
      const sig2 = generateSignature(params2, testSecret);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different secrets', () => {
      const params = { playerGuid: 'player-123', timestamp: 1234567890000 };

      const sig1 = generateSignature(params, 'secret-1');
      const sig2 = generateSignature(params, 'secret-2');

      expect(sig1).not.toBe(sig2);
    });

    it('should include score in signature when provided', () => {
      const paramsWithoutScore = { playerGuid: 'player-123', timestamp: 1234567890000 };
      const paramsWithScore = { playerGuid: 'player-123', timestamp: 1234567890000, score: 100 };

      const sig1 = generateSignature(paramsWithoutScore, testSecret);
      const sig2 = generateSignature(paramsWithScore, testSecret);

      expect(sig1).not.toBe(sig2);
    });

    it('should include runId in signature when provided', () => {
      const paramsWithoutRun = { playerGuid: 'player-123', timestamp: 1234567890000 };
      const paramsWithRun = { playerGuid: 'player-123', timestamp: 1234567890000, runId: 'run-abc' };

      const sig1 = generateSignature(paramsWithoutRun, testSecret);
      const sig2 = generateSignature(paramsWithRun, testSecret);

      expect(sig1).not.toBe(sig2);
    });

    it('should generate URL-safe base64 (no +, /, or =)', () => {
      // Generate multiple signatures to increase chance of hitting special chars
      for (let i = 0; i < 20; i++) {
        const params = { playerGuid: `player-${i}`, timestamp: Date.now() + i };
        const sig = generateSignature(params, testSecret);

        expect(sig).not.toContain('+');
        expect(sig).not.toContain('/');
        expect(sig).not.toContain('=');
      }
    });
  });

  describe('validateSignature', () => {
    const testSecret = 'test-secret-key-for-testing-purposes-123';

    it('should validate correct signature', () => {
      const params = { playerGuid: 'player-123', timestamp: 1234567890000 };
      const signature = generateSignature(params, testSecret);

      const isValid = validateSignature(params, signature, testSecret);
      expect(isValid).toBe(true);
    });

    it('should validate signature with score', () => {
      const params = { playerGuid: 'player-123', timestamp: 1234567890000, score: 500 };
      const signature = generateSignature(params, testSecret);

      const isValid = validateSignature(params, signature, testSecret);
      expect(isValid).toBe(true);
    });

    it('should validate signature with runId', () => {
      const params = { playerGuid: 'player-123', timestamp: 1234567890000, runId: 'run-xyz' };
      const signature = generateSignature(params, testSecret);

      const isValid = validateSignature(params, signature, testSecret);
      expect(isValid).toBe(true);
    });

    it('should validate signature with all params', () => {
      const params = {
        playerGuid: 'player-123',
        timestamp: 1234567890000,
        score: 1000,
        runId: 'run-abc-123',
      };
      const signature = generateSignature(params, testSecret);

      const isValid = validateSignature(params, signature, testSecret);
      expect(isValid).toBe(true);
    });

    it('should reject tampered signature', () => {
      const params = { playerGuid: 'player-123', timestamp: 1234567890000 };
      const signature = generateSignature(params, testSecret);

      // Tamper with signature
      const tamperedSig = signature.slice(0, -1) + 'X';

      const isValid = validateSignature(params, tamperedSig, testSecret);
      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong score', () => {
      const params = { playerGuid: 'player-123', timestamp: 1234567890000, score: 100 };
      const signature = generateSignature(params, testSecret);

      // Try to validate with different score (cheating attempt)
      const tamperedParams = { ...params, score: 999999 };
      const isValid = validateSignature(tamperedParams, signature, testSecret);
      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const params = { playerGuid: 'player-123', timestamp: 1234567890000 };
      const signature = generateSignature(params, testSecret);

      const isValid = validateSignature(params, signature, 'wrong-secret');
      expect(isValid).toBe(false);
    });

    it('should reject empty signature', () => {
      const params = { playerGuid: 'player-123', timestamp: 1234567890000 };
      const isValid = validateSignature(params, '', testSecret);
      expect(isValid).toBe(false);
    });

    it('should handle malformed signature gracefully', () => {
      const params = { playerGuid: 'player-123', timestamp: 1234567890000 };
      const isValid = validateSignature(params, 'not-a-valid-signature!!!', testSecret);
      expect(isValid).toBe(false);
    });
  });

  describe('validateTimestamp', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-03-11T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should accept fresh timestamp', () => {
      const now = Date.now();
      const result = validateTimestamp(now, 'fresh-ts-player');
      expect(result).toBeNull();
    });

    it('should accept timestamp within 60 seconds', () => {
      const timestamp = Date.now() - 30000; // 30 seconds ago
      const result = validateTimestamp(timestamp, 'within-60s-player');
      expect(result).toBeNull();
    });

    it('should reject timestamp older than 60 seconds', () => {
      const timestamp = Date.now() - 61000; // 61 seconds ago
      const result = validateTimestamp(timestamp, 'old-ts-player');
      expect(result).toContain('expired');
    });

    it('should reject timestamp too far in the future', () => {
      const timestamp = Date.now() + 10000; // 10 seconds in future
      const result = validateTimestamp(timestamp, 'future-ts-player');
      expect(result).toContain('future');
    });

    it('should allow small future timestamp (clock skew tolerance)', () => {
      const timestamp = Date.now() + 3000; // 3 seconds in future (within 5s tolerance)
      const result = validateTimestamp(timestamp, 'skew-ts-player');
      expect(result).toBeNull();
    });

    it('should detect replay attack (same timestamp + player)', () => {
      const timestamp = Date.now();
      const playerGuid = 'replay-test-player-unique';

      // First request should succeed
      const result1 = validateTimestamp(timestamp, playerGuid);
      expect(result1).toBeNull();

      // Replay should fail
      const result2 = validateTimestamp(timestamp, playerGuid);
      expect(result2).toContain('replay');
    });

    it('should allow same timestamp for different players', () => {
      const timestamp = Date.now() + 100; // Use different timestamp to avoid collision

      const result1 = validateTimestamp(timestamp, 'same-ts-player-A');
      expect(result1).toBeNull();

      const result2 = validateTimestamp(timestamp, 'same-ts-player-B');
      expect(result2).toBeNull();
    });

    it('should allow different timestamps for same player', () => {
      const playerGuid = 'diff-ts-player-unique';

      const result1 = validateTimestamp(Date.now() + 200, playerGuid);
      expect(result1).toBeNull();

      const result2 = validateTimestamp(Date.now() + 201, playerGuid);
      expect(result2).toBeNull();
    });
  });
});
