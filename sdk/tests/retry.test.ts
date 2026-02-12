/**
 * Unit tests for RetryQueue.
 * Mocks localStorage — no network required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RetryQueue } from '../src/RetryQueue';

describe('RetryQueue', () => {
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};
    vi.useFakeTimers();

    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('save() and get()', () => {
    it('should save and retrieve a pending score', () => {
      const queue = new RetryQueue('test_key');
      queue.save(1500);

      const pending = queue.get();
      expect(pending).toEqual({ score: 1500, metadata: undefined });
    });

    it('should save and retrieve score with metadata', () => {
      const queue = new RetryQueue('test_key');
      queue.save(1500, { level: 5, character: 'ace' });

      const pending = queue.get();
      expect(pending).toEqual({
        score: 1500,
        metadata: { level: 5, character: 'ace' },
      });
    });

    it('should return null when no pending score', () => {
      const queue = new RetryQueue('test_key');
      expect(queue.get()).toBeNull();
    });

    it('should overwrite previous pending score', () => {
      const queue = new RetryQueue('test_key');
      queue.save(1000);
      queue.save(2000);

      const pending = queue.get();
      expect(pending?.score).toBe(2000);
    });
  });

  describe('expiration', () => {
    it('should return pending score within maxAge', () => {
      const queue = new RetryQueue('test_key', 60000); // 1 minute
      queue.save(1500);

      vi.advanceTimersByTime(30000); // 30 seconds

      expect(queue.get()).not.toBeNull();
    });

    it('should return null and clear after maxAge expires', () => {
      const queue = new RetryQueue('test_key', 60000); // 1 minute
      queue.save(1500);

      vi.advanceTimersByTime(60001); // Just past expiry

      expect(queue.get()).toBeNull();
      // Verify it was cleared
      expect(mockStorage['test_key']).toBeUndefined();
    });

    it('should use default 24h maxAge', () => {
      const queue = new RetryQueue('test_key'); // Default maxAge
      queue.save(1500);

      vi.advanceTimersByTime(23 * 60 * 60 * 1000); // 23 hours
      expect(queue.get()).not.toBeNull();

      vi.advanceTimersByTime(2 * 60 * 60 * 1000); // +2 hours = 25 hours total
      expect(queue.get()).toBeNull();
    });
  });

  describe('hasPending()', () => {
    it('should return false when empty', () => {
      const queue = new RetryQueue('test_key');
      expect(queue.hasPending()).toBe(false);
    });

    it('should return true when has pending score', () => {
      const queue = new RetryQueue('test_key');
      queue.save(1500);
      expect(queue.hasPending()).toBe(true);
    });

    it('should return false after expiration', () => {
      const queue = new RetryQueue('test_key', 60000);
      queue.save(1500);

      vi.advanceTimersByTime(60001);
      expect(queue.hasPending()).toBe(false);
    });
  });

  describe('clear()', () => {
    it('should clear pending score', () => {
      const queue = new RetryQueue('test_key');
      queue.save(1500);
      queue.clear();

      expect(queue.get()).toBeNull();
      expect(mockStorage['test_key']).toBeUndefined();
    });
  });

  describe('localStorage unavailable', () => {
    it('should handle missing localStorage gracefully on save', () => {
      vi.stubGlobal('localStorage', undefined);
      const queue = new RetryQueue('test_key');

      // Should not throw
      expect(() => queue.save(1500)).not.toThrow();
    });

    it('should return null when localStorage unavailable', () => {
      const queue = new RetryQueue('test_key');
      queue.save(1500);

      // Simulate localStorage becoming unavailable
      vi.stubGlobal('localStorage', {
        getItem: () => { throw new Error('SecurityError'); },
        setItem: () => { throw new Error('SecurityError'); },
        removeItem: () => { throw new Error('SecurityError'); },
      });

      expect(queue.get()).toBeNull();
      expect(queue.hasPending()).toBe(false);
    });
  });

  describe('multiple queues', () => {
    it('should isolate data by storage key', () => {
      const queue1 = new RetryQueue('game1_retry');
      const queue2 = new RetryQueue('game2_retry');

      queue1.save(1000);
      queue2.save(2000);

      expect(queue1.get()?.score).toBe(1000);
      expect(queue2.get()?.score).toBe(2000);
    });
  });
});
