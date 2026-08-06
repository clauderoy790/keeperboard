import { describe, it, expect } from 'vitest';
import {
  PLATFORMS,
  InvalidPlatformError,
  normalizePlatform,
  normalizeGameVersion,
  normalizeSource,
  resolveCountry,
} from './platform';

/**
 * Tests for the platform and analytics dimension helpers.
 *
 * The governing rule: developer-supplied values fail loudly (400), auto-derived
 * values degrade quietly to null. Absent is never invalid.
 */

function requestWithHeaders(headers: Record<string, string>): Request {
  return new Request('https://api.keeperboard.dev/api/v1/runs/start', {
    method: 'POST',
    headers,
  });
}

describe('normalizePlatform', () => {
  it('accepts every supported platform', () => {
    for (const platform of PLATFORMS) {
      expect(normalizePlatform(platform)).toBe(platform);
    }
  });

  it('lowercases so casing is never a developer trap', () => {
    expect(normalizePlatform('iOS')).toBe('ios');
    expect(normalizePlatform('Android')).toBe('android');
    expect(normalizePlatform('WEB')).toBe('web');
    expect(normalizePlatform('MacOS')).toBe('macos');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizePlatform('  ios  ')).toBe('ios');
  });

  it('returns null when absent — required for SDK <= 2.2.2 clients', () => {
    expect(normalizePlatform(undefined)).toBeNull();
    expect(normalizePlatform(null)).toBeNull();
    expect(normalizePlatform('')).toBeNull();
    expect(normalizePlatform('   ')).toBeNull();
  });

  it('throws on a present-but-unrecognized value', () => {
    expect(() => normalizePlatform('iPhone')).toThrow(InvalidPlatformError);
    expect(() => normalizePlatform('desktop')).toThrow(InvalidPlatformError);
    expect(() => normalizePlatform('electron')).toThrow(InvalidPlatformError);
  });

  it('throws on non-string types rather than coercing them', () => {
    expect(() => normalizePlatform(42)).toThrow(InvalidPlatformError);
    expect(() => normalizePlatform(true)).toThrow(InvalidPlatformError);
    expect(() => normalizePlatform({ platform: 'ios' })).toThrow(InvalidPlatformError);
  });

  it('names the received value and the valid set in the error', () => {
    try {
      normalizePlatform('iPhone');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidPlatformError);
      expect((error as Error).message).toContain('"iPhone"');
      expect((error as Error).message).toContain('web, ios, android, windows, macos, linux');
    }
  });
});

describe('resolveCountry', () => {
  it('reads and uppercases the Vercel geo header', () => {
    expect(resolveCountry(requestWithHeaders({ 'x-vercel-ip-country': 'CA' }))).toBe('CA');
    expect(resolveCountry(requestWithHeaders({ 'x-vercel-ip-country': 'us' }))).toBe('US');
  });

  it('returns null locally, where the header is absent', () => {
    expect(resolveCountry(requestWithHeaders({}))).toBeNull();
  });

  it('rejects malformed values instead of storing junk', () => {
    expect(resolveCountry(requestWithHeaders({ 'x-vercel-ip-country': 'CAN' }))).toBeNull();
    expect(resolveCountry(requestWithHeaders({ 'x-vercel-ip-country': 'C' }))).toBeNull();
    expect(resolveCountry(requestWithHeaders({ 'x-vercel-ip-country': '12' }))).toBeNull();
  });

  it('treats Vercel\'s "XX" unknown marker as no data', () => {
    expect(resolveCountry(requestWithHeaders({ 'x-vercel-ip-country': 'XX' }))).toBeNull();
  });
});

describe('normalizeGameVersion', () => {
  it('keeps a normal version string', () => {
    expect(normalizeGameVersion('1.4.2')).toBe('1.4.2');
  });

  it('returns null for absent or empty values', () => {
    expect(normalizeGameVersion(undefined)).toBeNull();
    expect(normalizeGameVersion('')).toBeNull();
    expect(normalizeGameVersion('   ')).toBeNull();
    expect(normalizeGameVersion(42)).toBeNull();
  });

  it('truncates to the column constraint rather than failing the submission', () => {
    expect(normalizeGameVersion('v'.repeat(50))).toHaveLength(32);
  });
});

describe('normalizeSource', () => {
  it('keeps a well-formed tag', () => {
    expect(normalizeSource('reddit-webgames')).toBe('reddit-webgames');
    expect(normalizeSource('itch.io')).toBe('itch.io');
    expect(normalizeSource('twitter_jan')).toBe('twitter_jan');
  });

  it('lowercases so tags do not fragment into near-duplicates', () => {
    expect(normalizeSource('Reddit-WebGames')).toBe('reddit-webgames');
  });

  it('strips characters outside the allowed set', () => {
    expect(normalizeSource('reddit webgames!')).toBe('redditwebgames');
    expect(normalizeSource('<script>alert(1)</script>')).toBe('scriptalert1script');
  });

  it('returns null when nothing survives sanitization', () => {
    expect(normalizeSource('!!!')).toBeNull();
    expect(normalizeSource('   ')).toBeNull();
    expect(normalizeSource(undefined)).toBeNull();
  });

  it('truncates to the column constraint', () => {
    expect(normalizeSource('a'.repeat(100))).toHaveLength(64);
  });
});
