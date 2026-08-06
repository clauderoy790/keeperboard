/**
 * Unit tests for first-touch acquisition capture.
 *
 * The governing rule: once a source is stored it is never overwritten, so a player stays
 * credited to the link that originally brought them in.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { captureSource, clearSource } from '../src/source';

const PREFIX = 'testgame_';
const KEY = `${PREFIX}source`;

/** Minimal localStorage stand-in — the SDK only uses get/set/remove. */
function createStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    get size() {
      return store.size;
    },
  };
}

let storage: ReturnType<typeof createStorage>;

function visit(search: string) {
  (globalThis as any).window.location.search = search;
}

beforeEach(() => {
  storage = createStorage();
  (globalThis as any).window = {
    localStorage: storage,
    location: { search: '' },
  };
  (globalThis as any).localStorage = storage;
});

afterEach(() => {
  delete (globalThis as any).window;
  delete (globalThis as any).localStorage;
  vi.restoreAllMocks();
});

describe('captureSource', () => {
  it('captures a ?ref= tag on first visit', () => {
    visit('?ref=reddit-webgames');
    expect(captureSource(PREFIX)).toBe('reddit-webgames');
    expect(storage.getItem(KEY)).toBe('reddit-webgames');
  });

  it('returns null when the player arrives untagged', () => {
    visit('');
    expect(captureSource(PREFIX)).toBeNull();
    expect(storage.getItem(KEY)).toBeNull();
  });

  it('ignores unrelated query parameters', () => {
    visit('?utm_campaign=spring&debug=1');
    expect(captureSource(PREFIX)).toBeNull();
  });

  it('persists across visits — a returning player keeps their source', () => {
    visit('?ref=itch-io');
    expect(captureSource(PREFIX)).toBe('itch-io');

    // Player returns later by typing the URL directly
    visit('');
    expect(captureSource(PREFIX)).toBe('itch-io');
  });

  it('never overwrites — first touch wins over a later different link', () => {
    visit('?ref=reddit-webgames');
    expect(captureSource(PREFIX)).toBe('reddit-webgames');

    visit('?ref=twitter');
    expect(captureSource(PREFIX)).toBe('reddit-webgames');
    expect(storage.getItem(KEY)).toBe('reddit-webgames');
  });

  it('captures later if the first visit was untagged', () => {
    visit('');
    expect(captureSource(PREFIX)).toBeNull();

    // Recording the first source we actually learn beats recording none
    visit('?ref=reddit-webgames');
    expect(captureSource(PREFIX)).toBe('reddit-webgames');
  });

  it('lowercases so one campaign cannot fragment into near-duplicates', () => {
    visit('?ref=Reddit-WebGames');
    expect(captureSource(PREFIX)).toBe('reddit-webgames');
  });

  it('strips characters outside the allowed set', () => {
    visit('?ref=' + encodeURIComponent('reddit webgames!'));
    expect(captureSource(PREFIX)).toBe('redditwebgames');
  });

  it('keeps dots, underscores and hyphens', () => {
    visit('?ref=itch.io_launch-2026');
    expect(captureSource(PREFIX)).toBe('itch.io_launch-2026');
  });

  it('truncates to 64 characters', () => {
    visit('?ref=' + 'a'.repeat(200));
    expect(captureSource(PREFIX)).toHaveLength(64);
  });

  it('stores nothing when the tag sanitizes to empty', () => {
    visit('?ref=' + encodeURIComponent('!!!'));
    expect(captureSource(PREFIX)).toBeNull();
    expect(storage.getItem(KEY)).toBeNull();
  });

  it('scopes storage to the key prefix', () => {
    visit('?ref=reddit');
    captureSource('flight747_');

    expect(storage.getItem('flight747_source')).toBe('reddit');
    expect(storage.getItem(KEY)).toBeNull();
  });

  it('returns null without a window — SSR and Node must not throw', () => {
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;

    expect(() => captureSource(PREFIX)).not.toThrow();
    expect(captureSource(PREFIX)).toBeNull();
  });

  it('returns null when storage throws, e.g. privacy mode', () => {
    (globalThis as any).window = {
      localStorage: {
        getItem: () => {
          throw new Error('SecurityError');
        },
        setItem: () => {
          throw new Error('SecurityError');
        },
        removeItem: () => {},
      },
      location: { search: '?ref=reddit' },
    };

    expect(() => captureSource(PREFIX)).not.toThrow();
    expect(captureSource(PREFIX)).toBeNull();
  });
});

describe('clearSource', () => {
  it('removes the stored source', () => {
    visit('?ref=reddit');
    expect(captureSource(PREFIX)).toBe('reddit');

    clearSource(PREFIX);
    expect(storage.getItem(KEY)).toBeNull();
  });

  it('is safe without a window', () => {
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
    expect(() => clearSource(PREFIX)).not.toThrow();
  });
});
