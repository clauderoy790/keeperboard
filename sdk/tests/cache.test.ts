/**
 * Unit tests for Cache.
 * Uses fake timers — no network required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Cache } from '../src/Cache';

describe('Cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getOrFetch()', () => {
    it('should fetch on first call', async () => {
      const cache = new Cache<string>(1000);
      const fetchFn = vi.fn().mockResolvedValue('data');

      const result = await cache.getOrFetch(fetchFn);

      expect(result).toBe('data');
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should return cached data within TTL', async () => {
      const cache = new Cache<string>(1000);
      const fetchFn = vi.fn().mockResolvedValue('data');

      await cache.getOrFetch(fetchFn);
      vi.advanceTimersByTime(500); // Still within TTL
      const result = await cache.getOrFetch(fetchFn);

      expect(result).toBe('data');
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should re-fetch after TTL expires', async () => {
      const cache = new Cache<string>(1000);
      const fetchFn = vi.fn()
        .mockResolvedValueOnce('data1')
        .mockResolvedValueOnce('data2');

      await cache.getOrFetch(fetchFn);
      vi.advanceTimersByTime(1001); // Past TTL
      const result = await cache.getOrFetch(fetchFn);

      expect(result).toBe('data2');
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should deduplicate concurrent fetches', async () => {
      const cache = new Cache<string>(1000);
      let resolveFirst: (v: string) => void;
      const fetchFn = vi.fn().mockImplementation(() =>
        new Promise<string>((resolve) => { resolveFirst = resolve; })
      );

      const promise1 = cache.getOrFetch(fetchFn);
      const promise2 = cache.getOrFetch(fetchFn);
      const promise3 = cache.getOrFetch(fetchFn);

      resolveFirst!('data');

      const [r1, r2, r3] = await Promise.all([promise1, promise2, promise3]);

      expect(r1).toBe('data');
      expect(r2).toBe('data');
      expect(r3).toBe('data');
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors', async () => {
      const cache = new Cache<string>(1000);
      const fetchFn = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(cache.getOrFetch(fetchFn)).rejects.toThrow('Network error');
    });

    it('should allow retry after error', async () => {
      const cache = new Cache<string>(1000);
      const fetchFn = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('data');

      await expect(cache.getOrFetch(fetchFn)).rejects.toThrow('Network error');
      const result = await cache.getOrFetch(fetchFn);

      expect(result).toBe('data');
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshInBackground()', () => {
    it('should refresh data in background', async () => {
      const cache = new Cache<string>(1000);
      const fetchFn = vi.fn().mockResolvedValue('initial');

      await cache.getOrFetch(fetchFn);
      expect(cache.get()).toBe('initial');

      const bgFetchFn = vi.fn().mockResolvedValue('updated');
      cache.invalidate();
      cache.refreshInBackground(bgFetchFn);

      // Wait for background fetch to complete
      await vi.runAllTimersAsync();

      expect(cache.get()).toBe('updated');
    });

    it('should schedule refresh when one is already in flight', async () => {
      const cache = new Cache<string>(1000);
      let resolveFirst: (v: string) => void;
      const firstFetch = vi.fn().mockImplementation(() =>
        new Promise<string>((resolve) => { resolveFirst = resolve; })
      );
      const secondFetch = vi.fn().mockResolvedValue('second');

      // Start first background fetch
      cache.refreshInBackground(firstFetch);

      // Request second refresh while first is in flight
      cache.refreshInBackground(secondFetch);

      // Complete first fetch
      resolveFirst!('first');
      await vi.runAllTimersAsync();

      // Both fetches should have run
      expect(firstFetch).toHaveBeenCalledTimes(1);
      expect(secondFetch).toHaveBeenCalledTimes(1);

      // Final data should be from second fetch
      expect(cache.get()).toBe('second');
    });

    it('should only keep latest pending refresh', async () => {
      const cache = new Cache<string>(1000);
      let resolveFirst: (v: string) => void;
      const firstFetch = vi.fn().mockImplementation(() =>
        new Promise<string>((resolve) => { resolveFirst = resolve; })
      );
      const secondFetch = vi.fn().mockResolvedValue('second');
      const thirdFetch = vi.fn().mockResolvedValue('third');

      // Start first background fetch
      cache.refreshInBackground(firstFetch);

      // Request multiple refreshes while first is in flight
      cache.refreshInBackground(secondFetch);
      cache.refreshInBackground(thirdFetch);

      // Complete first fetch
      resolveFirst!('first');
      await vi.runAllTimersAsync();

      // First and third should have run (second was replaced by third)
      expect(firstFetch).toHaveBeenCalledTimes(1);
      expect(secondFetch).not.toHaveBeenCalled();
      expect(thirdFetch).toHaveBeenCalledTimes(1);

      // Final data should be from third fetch
      expect(cache.get()).toBe('third');
    });

    it('should clear pending refresh on error', async () => {
      const cache = new Cache<string>(1000);
      const failingFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const successFetch = vi.fn().mockResolvedValue('success');

      // Start failing background fetch with pending
      cache.refreshInBackground(failingFetch);
      cache.refreshInBackground(successFetch);

      await vi.runAllTimersAsync();

      // Error in first fetch should clear pending
      expect(failingFetch).toHaveBeenCalledTimes(1);
      expect(successFetch).not.toHaveBeenCalled();
    });
  });

  describe('invalidate()', () => {
    it('should force re-fetch on next getOrFetch', async () => {
      const cache = new Cache<string>(1000);
      const fetchFn = vi.fn()
        .mockResolvedValueOnce('data1')
        .mockResolvedValueOnce('data2');

      await cache.getOrFetch(fetchFn);
      cache.invalidate();
      const result = await cache.getOrFetch(fetchFn);

      expect(result).toBe('data2');
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('get() and getStale()', () => {
    it('get() should return undefined when empty', () => {
      const cache = new Cache<string>(1000);
      expect(cache.get()).toBeUndefined();
    });

    it('get() should return data when fresh', async () => {
      const cache = new Cache<string>(1000);
      await cache.getOrFetch(async () => 'data');
      expect(cache.get()).toBe('data');
    });

    it('get() should return undefined when stale', async () => {
      const cache = new Cache<string>(1000);
      await cache.getOrFetch(async () => 'data');
      vi.advanceTimersByTime(1001);
      expect(cache.get()).toBeUndefined();
    });

    it('getStale() should return data even when stale', async () => {
      const cache = new Cache<string>(1000);
      await cache.getOrFetch(async () => 'data');
      vi.advanceTimersByTime(1001);
      expect(cache.getStale()).toBe('data');
    });
  });

  describe('isFresh()', () => {
    it('should return false when empty', () => {
      const cache = new Cache<string>(1000);
      expect(cache.isFresh()).toBe(false);
    });

    it('should return true when within TTL', async () => {
      const cache = new Cache<string>(1000);
      await cache.getOrFetch(async () => 'data');
      expect(cache.isFresh()).toBe(true);
    });

    it('should return false after TTL', async () => {
      const cache = new Cache<string>(1000);
      await cache.getOrFetch(async () => 'data');
      vi.advanceTimersByTime(1001);
      expect(cache.isFresh()).toBe(false);
    });
  });
});
