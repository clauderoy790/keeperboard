/**
 * Unit tests for KeeperBoardSession.
 * Mocks KeeperBoardClient and PlayerIdentity — no network or localStorage required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock client functions
const mockSubmitScore = vi.fn();
const mockGetLeaderboard = vi.fn();
const mockGetPlayerRank = vi.fn();
const mockUpdatePlayerName = vi.fn();

// Create mock identity functions
let mockPlayerGuid = 'test-player-guid';
let mockPlayerName: string | null = null;

const mockGetOrCreatePlayerGuid = vi.fn(() => mockPlayerGuid);
const mockGetPlayerName = vi.fn(() => mockPlayerName);
const mockSetPlayerName = vi.fn((name: string) => { mockPlayerName = name; });

// Mock KeeperBoardClient
vi.mock('../src/KeeperBoardClient', () => ({
  KeeperBoardClient: function() {
    return {
      submitScore: mockSubmitScore,
      getLeaderboard: mockGetLeaderboard,
      getPlayerRank: mockGetPlayerRank,
      updatePlayerName: mockUpdatePlayerName,
    };
  },
}));

// Mock PlayerIdentity
vi.mock('../src/PlayerIdentity', () => ({
  PlayerIdentity: function() {
    return {
      getOrCreatePlayerGuid: mockGetOrCreatePlayerGuid,
      getPlayerName: mockGetPlayerName,
      setPlayerName: mockSetPlayerName,
    };
  },
}));

import { KeeperBoardSession } from '../src/KeeperBoardSession';

describe('KeeperBoardSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    // Reset state
    mockPlayerGuid = 'test-player-guid';
    mockPlayerName = null;

    // Reset mocks and set default responses
    vi.clearAllMocks();

    mockSubmitScore.mockResolvedValue({
      rank: 1,
      score: 1000,
      isNewHighScore: true,
      playerGuid: 'test-guid',
      playerName: 'TestPlayer',
    });

    mockGetLeaderboard.mockResolvedValue({
      entries: [
        { rank: 1, playerGuid: 'p1', playerName: 'Player1', score: 2000 },
        { rank: 2, playerGuid: 'p2', playerName: 'Player2', score: 1500 },
      ],
      totalCount: 2,
      resetSchedule: null,
      nextReset: null,
    });

    mockGetPlayerRank.mockResolvedValue(null);

    mockUpdatePlayerName.mockResolvedValue({
      playerGuid: 'test-guid',
      playerName: 'NewName',
      rank: 1,
      score: 1000,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================
  // IDENTITY MANAGEMENT
  // ============================================

  describe('identity management', () => {
    it('should delegate to PlayerIdentity for GUID', () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
      });

      const guid = session.getPlayerGuid();
      expect(guid).toBe('test-player-guid');
      expect(mockGetOrCreatePlayerGuid).toHaveBeenCalled();
    });

    it('should use default player name when identity returns null', () => {
      mockPlayerName = null;
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
        defaultPlayerName: 'ANON',
      });

      expect(session.getPlayerName()).toBe('ANON');
    });

    it('should set and get player name via identity', () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
      });

      session.setPlayerName('CustomName');
      expect(mockSetPlayerName).toHaveBeenCalledWith('CustomName');
      expect(session.getPlayerName()).toBe('CustomName');
    });

    it('should validate names using validateName()', () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
      });

      expect(session.validateName('  VALID_NAME  ')).toBe('VALID_NAME');
      expect(session.validateName('A')).toBeNull(); // Too short
      expect(session.validateName('')).toBeNull();
    });
  });

  // ============================================
  // SCORE SUBMISSION
  // ============================================

  describe('submitScore()', () => {
    it('should submit score with auto-injected identity', async () => {
      mockPlayerName = 'TestPlayer';
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
      });

      const result = await session.submitScore(1000);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.rank).toBe(1);
        expect(result.isNewHighScore).toBe(true);
      }

      expect(mockSubmitScore).toHaveBeenCalledWith({
        playerGuid: 'test-player-guid',
        playerName: 'TestPlayer',
        score: 1000,
        metadata: undefined,
      });
    });

    it('should pass metadata to submitScore', async () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
      });

      await session.submitScore(1000, { level: 5, mode: 'hard' });

      expect(mockSubmitScore).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { level: 5, mode: 'hard' },
        })
      );
    });

    it('should return error on failure', async () => {
      mockSubmitScore.mockRejectedValue(new Error('Network error'));

      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
      });

      const result = await session.submitScore(1000);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Network error');
      }
    });

    it('should prevent double submission', async () => {
      let resolveSubmit: (v: unknown) => void;
      mockSubmitScore.mockImplementation(() =>
        new Promise((resolve) => { resolveSubmit = resolve; })
      );

      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
      });

      // Start first submission
      const promise1 = session.submitScore(1000);

      // Try second submission while first is in progress
      const result2 = await session.submitScore(2000);

      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.error).toBe('Submission in progress');
      }

      // Complete first submission
      resolveSubmit!({ rank: 1, score: 1000, isNewHighScore: true });
      const result1 = await promise1;
      expect(result1.success).toBe(true);

      // Only one API call should have been made
      expect(mockSubmitScore).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================
  // RETRY QUEUE
  // ============================================

  describe('retry queue', () => {
    let mockStorage: Record<string, string>;

    beforeEach(() => {
      mockStorage = {};
      vi.stubGlobal('localStorage', {
        getItem: (key: string) => mockStorage[key] ?? null,
        setItem: (key: string, value: string) => { mockStorage[key] = value; },
        removeItem: (key: string) => { delete mockStorage[key]; },
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should save failed submission to retry queue', async () => {
      mockSubmitScore.mockRejectedValue(new Error('Network error'));

      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
        retry: { maxAgeMs: 60000 },
      });

      await session.submitScore(1500);

      expect(session.hasPendingScore()).toBe(true);
    });

    it('should clear retry queue on success', async () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
        retry: { maxAgeMs: 60000 },
      });

      // First: fail
      mockSubmitScore.mockRejectedValueOnce(new Error('Network error'));
      await session.submitScore(1500);
      expect(session.hasPendingScore()).toBe(true);

      // Second: succeed
      mockSubmitScore.mockResolvedValueOnce({
        rank: 1,
        score: 1500,
        isNewHighScore: true,
      });
      await session.retryPendingScore();
      expect(session.hasPendingScore()).toBe(false);
    });

    it('should return null when no pending score', async () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
        retry: { maxAgeMs: 60000 },
      });

      const result = await session.retryPendingScore();
      expect(result).toBeNull();
    });
  });

  // ============================================
  // CACHE INTEGRATION
  // ============================================

  describe('cache integration', () => {
    it('should cache getSnapshot results', async () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
        cache: { ttlMs: 5000 },
      });

      await session.getSnapshot();
      await session.getSnapshot();
      await session.getSnapshot();

      // Only one API call despite multiple getSnapshot calls
      expect(mockGetLeaderboard).toHaveBeenCalledTimes(1);
    });

    it('should re-fetch after TTL expires', async () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
        cache: { ttlMs: 5000 },
      });

      await session.getSnapshot();
      vi.advanceTimersByTime(5001);
      await session.getSnapshot();

      expect(mockGetLeaderboard).toHaveBeenCalledTimes(2);
    });

    it('should re-fetch when larger limit is requested', async () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
        cache: { ttlMs: 5000 },
      });

      // First request with limit 10
      await session.getSnapshot({ limit: 10 });
      expect(mockGetLeaderboard).toHaveBeenCalledTimes(1);

      // Second request with smaller limit - should use cache
      await session.getSnapshot({ limit: 5 });
      expect(mockGetLeaderboard).toHaveBeenCalledTimes(1);

      // Third request with larger limit - should re-fetch
      await session.getSnapshot({ limit: 50 });
      expect(mockGetLeaderboard).toHaveBeenCalledTimes(2);
      expect(mockGetLeaderboard).toHaveBeenLastCalledWith({ limit: 50 });
    });

    it('should invalidate cache after submitScore', async () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
        cache: { ttlMs: 5000 },
      });

      await session.getSnapshot();
      expect(mockGetLeaderboard).toHaveBeenCalledTimes(1);

      await session.submitScore(1000);
      await vi.runAllTimersAsync(); // Let background refresh complete

      // Cache was invalidated, so should have fetched again
      expect(mockGetLeaderboard).toHaveBeenCalledTimes(2);
    });

    it('should invalidate cache after updatePlayerName', async () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
        cache: { ttlMs: 5000 },
      });

      await session.getSnapshot();
      await session.updatePlayerName('NewName');
      await session.getSnapshot();

      // Should have fetched twice due to invalidation
      expect(mockGetLeaderboard).toHaveBeenCalledTimes(2);
    });
  });

  // ============================================
  // SNAPSHOT COMBINING
  // ============================================

  describe('getSnapshot()', () => {
    it('should mark current player in entries', async () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
      });

      mockGetLeaderboard.mockResolvedValue({
        entries: [
          { rank: 1, playerGuid: 'test-player-guid', playerName: 'Me', score: 2000 },
          { rank: 2, playerGuid: 'other', playerName: 'Other', score: 1500 },
        ],
        totalCount: 2,
      });

      const snapshot = await session.getSnapshot();

      expect(snapshot.entries[0].isCurrentPlayer).toBe(true);
      expect(snapshot.entries[1].isCurrentPlayer).toBe(false);
    });

    it('should include playerRank when player is outside entries', async () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
      });

      mockGetLeaderboard.mockResolvedValue({
        entries: [
          { rank: 1, playerGuid: 'p1', playerName: 'Player1', score: 2000 },
          { rank: 2, playerGuid: 'p2', playerName: 'Player2', score: 1500 },
        ],
        totalCount: 100,
      });

      mockGetPlayerRank.mockResolvedValue({
        playerGuid: 'test-player-guid',
        playerName: 'Me',
        rank: 50,
        score: 500,
      });

      const snapshot = await session.getSnapshot();

      expect(snapshot.playerRank).not.toBeNull();
      expect(snapshot.playerRank?.rank).toBe(50);
    });

    it('should NOT include playerRank when player is in entries', async () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
      });

      mockGetLeaderboard.mockResolvedValue({
        entries: [
          { rank: 1, playerGuid: 'test-player-guid', playerName: 'Me', score: 2000 },
          { rank: 2, playerGuid: 'p2', playerName: 'Player2', score: 1500 },
        ],
        totalCount: 2,
      });

      // Even if API returns playerRank, it should be excluded
      mockGetPlayerRank.mockResolvedValue({
        playerGuid: 'test-player-guid',
        playerName: 'Me',
        rank: 1,
        score: 2000,
      });

      const snapshot = await session.getSnapshot();

      expect(snapshot.playerRank).toBeNull();
    });
  });

  // ============================================
  // UPDATE PLAYER NAME
  // ============================================

  describe('updatePlayerName()', () => {
    it('should update name on server and locally', async () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
      });

      const success = await session.updatePlayerName('NewName');

      expect(success).toBe(true);
      expect(mockSetPlayerName).toHaveBeenCalledWith('NewName');
      expect(mockUpdatePlayerName).toHaveBeenCalledWith({
        playerGuid: 'test-player-guid',
        newName: 'NewName',
      });
    });

    it('should return false on failure without updating local name', async () => {
      mockUpdatePlayerName.mockRejectedValue(new Error('Server error'));
      mockPlayerName = 'OriginalName';

      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
      });

      const success = await session.updatePlayerName('NewName');

      expect(success).toBe(false);
      // setPlayerName should NOT have been called on failure
      expect(mockSetPlayerName).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // PREFETCH
  // ============================================

  describe('prefetch()', () => {
    it('should trigger background fetch', async () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
        cache: { ttlMs: 5000 },
      });

      session.prefetch();
      await vi.runAllTimersAsync();

      expect(mockGetLeaderboard).toHaveBeenCalledTimes(1);
    });

    it('should be no-op when cache is disabled', () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
        // No cache config
      });

      session.prefetch(); // Should not throw

      expect(mockGetLeaderboard).not.toHaveBeenCalled();
    });

    it('should be no-op when cache is fresh', async () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
        cache: { ttlMs: 5000 },
      });

      await session.getSnapshot(); // Populate cache
      session.prefetch(); // Should be no-op

      expect(mockGetLeaderboard).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================
  // ESCAPE HATCH
  // ============================================

  describe('getClient()', () => {
    it('should return underlying client', () => {
      const session = new KeeperBoardSession({
        apiKey: 'test-key',
        leaderboard: 'main',
      });

      const client = session.getClient();
      expect(client).toBeDefined();
    });
  });
});
