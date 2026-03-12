import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGameSettings, getAntiCheatSettings } from '@/lib/api/game';
import { containsProfanity } from '@/lib/profanity';

/**
 * Tests for run token endpoints: /api/v1/runs/start and /api/v1/runs/finish
 *
 * These tests focus on validation logic and expected behaviors.
 * Database interactions are mocked.
 */

// Mock Supabase admin client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  ilike: vi.fn(() => mockSupabase),
  gt: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
  single: vi.fn(() => Promise.resolve({ data: null, error: null })),
};

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockSupabase,
}));

vi.mock('@/lib/api/auth', () => ({
  validateApiKey: vi.fn().mockResolvedValue({
    gameId: 'test-game-id',
    environmentId: 'test-env-id',
    rateLimitHeaders: {},
  }),
}));

vi.mock('@/lib/api/leaderboard', () => ({
  resolveLeaderboard: vi.fn().mockResolvedValue({
    leaderboardId: 'test-leaderboard-id',
    sortOrder: 'desc',
    resetSchedule: 'none',
    resetHour: 0,
    currentVersion: 1,
    currentPeriodStart: '2026-01-01T00:00:00Z',
  }),
}));

vi.mock('@/lib/api/game', () => ({
  getGameSettings: vi.fn().mockResolvedValue({
    profanityFilterEnabled: false,
  }),
  getAntiCheatSettings: vi.fn().mockResolvedValue({
    signingEnabled: false,
    signingSecret: null,
    scoreCap: null,
    minElapsedSeconds: 5,
    requireRunToken: false,
  }),
}));

vi.mock('@/lib/api/version', () => ({
  resolveCurrentVersion: vi.fn().mockResolvedValue({
    version: 1,
    periodStart: '2026-01-01T00:00:00Z',
    didReset: false,
  }),
}));

vi.mock('@/lib/profanity', () => ({
  containsProfanity: vi.fn().mockReturnValue(false),
}));

// Import after mocks are set up
import { POST as startRun } from './start/route';
import { POST as finishRun } from './finish/route';

function createRequest(body: object, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/v1/runs/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'kb_test_key',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function createValidRunMock(overrides: Record<string, unknown> = {}) {
  const tenSecondsAgo = new Date(Date.now() - 10 * 1000).toISOString();
  return {
    id: 'run-123',
    leaderboard_id: 'lb-123',
    player_guid: 'test-123',
    started_at: tenSecondsAgo,
    used: false,
    leaderboards: {
      id: 'lb-123',
      game_id: 'test-game-id',
      environment_id: 'test-env-id',
      sort_order: 'desc',
      reset_schedule: 'none',
      reset_hour: 0,
      current_version: 1,
      current_period_start: '2026-01-01T00:00:00Z',
    },
    ...overrides,
  };
}

describe('/api/v1/runs/start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.single.mockResolvedValue({ data: null, error: null });
  });

  describe('validation', () => {
    it('should reject request without player_guid', async () => {
      const request = createRequest({});
      const response = await startRun(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_REQUEST');
      expect(data.error).toContain('player_guid');
    });

    it('should accept valid request with player_guid', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'run-123', started_at: '2026-03-11T10:00:00Z' },
        error: null,
      });

      const request = createRequest({ player_guid: 'test-player-123' });
      const response = await startRun(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.run_id).toBe('run-123');
      expect(data.data.started_at).toBeDefined();
      expect(data.data.expires_at).toBeDefined();
    });
  });
});

describe('/api/v1/runs/finish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.single.mockResolvedValue({ data: null, error: null });
  });

  describe('request validation', () => {
    it('should reject request without required fields', async () => {
      const request = createRequest({});
      const response = await finishRun(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.code).toBe('INVALID_REQUEST');
    });

    it('should reject request with missing run_id', async () => {
      const request = createRequest({
        player_guid: 'test-123',
        player_name: 'Test',
        score: 100,
      });
      const response = await finishRun(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('INVALID_REQUEST');
    });

    it('should reject request with non-number score', async () => {
      const request = createRequest({
        run_id: 'run-123',
        player_guid: 'test-123',
        player_name: 'Test',
        score: 'not-a-number',
      });
      const response = await finishRun(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('INVALID_REQUEST');
    });
  });

  describe('run lookup', () => {
    it('should return 404 for non-existent run', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'not found' },
      });

      const request = createRequest({
        run_id: 'non-existent-run',
        player_guid: 'test-123',
        player_name: 'Test',
        score: 100,
      });
      const response = await finishRun(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('RUN_NOT_FOUND');
    });
  });

  describe('player validation', () => {
    it('should reject if player_guid does not match run', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: createValidRunMock({ player_guid: 'original-player' }),
        error: null,
      });

      const request = createRequest({
        run_id: 'run-123',
        player_guid: 'different-player',
        player_name: 'Test',
        score: 100,
      });
      const response = await finishRun(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe('PLAYER_MISMATCH');
    });
  });

  describe('run state validation', () => {
    it('should reject already used run', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: createValidRunMock({ used: true }),
        error: null,
      });

      const request = createRequest({
        run_id: 'run-123',
        player_guid: 'test-123',
        player_name: 'Test',
        score: 100,
      });
      const response = await finishRun(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('RUN_ALREADY_USED');
    });

    it('should reject expired run (>1 hour old)', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      mockSupabase.single.mockResolvedValueOnce({
        data: createValidRunMock({ started_at: twoHoursAgo }),
        error: null,
      });

      const request = createRequest({
        run_id: 'run-123',
        player_guid: 'test-123',
        player_name: 'Test',
        score: 100,
      });
      const response = await finishRun(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('RUN_EXPIRED');
    });
  });

  describe('elapsed time validation', () => {
    it('should reject if elapsed time < min_elapsed_seconds', async () => {
      // Set min elapsed to 10 seconds
      vi.mocked(getAntiCheatSettings).mockResolvedValueOnce({
        signingEnabled: false,
        signingSecret: null,
        scoreCap: null,
        minElapsedSeconds: 10,
        requireRunToken: false,
      });

      // Run started 3 seconds ago (too short)
      const threeSecondsAgo = new Date(Date.now() - 3 * 1000).toISOString();

      mockSupabase.single.mockResolvedValueOnce({
        data: createValidRunMock({ started_at: threeSecondsAgo }),
        error: null,
      });

      const request = createRequest({
        run_id: 'run-123',
        player_guid: 'test-123',
        player_name: 'Test',
        score: 100,
      });
      const response = await finishRun(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('ELAPSED_TIME_TOO_SHORT');
      expect(data.error).toContain('10 seconds');
    });
  });

  describe('score cap validation', () => {
    it('should reject score exceeding score_cap', async () => {
      vi.mocked(getAntiCheatSettings).mockResolvedValueOnce({
        signingEnabled: false,
        signingSecret: null,
        scoreCap: 1000, // Max score 1000
        minElapsedSeconds: 5,
        requireRunToken: false,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: createValidRunMock(),
        error: null,
      });

      const request = createRequest({
        run_id: 'run-123',
        player_guid: 'test-123',
        player_name: 'Test',
        score: 5000, // Exceeds cap
      });
      const response = await finishRun(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('SCORE_CAP_EXCEEDED');
      expect(data.error).toContain('1000');
    });
  });

  describe('profanity filter', () => {
    it('should reject profane player names when filter is enabled', async () => {
      // Enable profanity filter
      vi.mocked(getGameSettings).mockResolvedValueOnce({
        profanityFilterEnabled: true,
      });

      // Name contains profanity
      vi.mocked(containsProfanity).mockReturnValueOnce(true);

      vi.mocked(getAntiCheatSettings).mockResolvedValueOnce({
        signingEnabled: false,
        signingSecret: null,
        scoreCap: null,
        minElapsedSeconds: 5,
        requireRunToken: false,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: createValidRunMock(),
        error: null,
      });

      const request = createRequest({
        run_id: 'run-123',
        player_guid: 'test-123',
        player_name: 'BadWord',
        score: 100,
      });
      const response = await finishRun(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('PROFANITY_DETECTED');
    });

    it('should allow clean names when filter is enabled', async () => {
      // Enable profanity filter
      vi.mocked(getGameSettings).mockResolvedValueOnce({
        profanityFilterEnabled: true,
      });

      // Name is clean
      vi.mocked(containsProfanity).mockReturnValueOnce(false);

      vi.mocked(getAntiCheatSettings).mockResolvedValueOnce({
        signingEnabled: false,
        signingSecret: null,
        scoreCap: null,
        minElapsedSeconds: 5,
        requireRunToken: false,
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: createValidRunMock(),
        error: null,
      });

      // Mock the rest of the successful flow
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null }); // update run
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // no existing score
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'score-123' }, error: null }); // insert score

      const request = createRequest({
        run_id: 'run-123',
        player_guid: 'test-123',
        player_name: 'CleanName',
        score: 100,
      });
      const response = await finishRun(request);
      const data = await response.json();

      // Should pass profanity check and continue to score submission
      expect(data.code).not.toBe('PROFANITY_DETECTED');
    });
  });

});
