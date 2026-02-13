// src/types.ts
var KeeperBoardError = class extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = "KeeperBoardError";
  }
};

// src/KeeperBoardClient.ts
var _KeeperBoardClient = class _KeeperBoardClient {
  constructor(config) {
    const url = config.apiUrl ?? _KeeperBoardClient.DEFAULT_API_URL;
    this.apiUrl = url.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.defaultLeaderboard = config.defaultLeaderboard;
  }
  // ============================================
  // SCORE SUBMISSION
  // ============================================
  /**
   * Submit a score. Only updates if the new score is higher than the existing one.
   *
   * @example
   * const result = await client.submitScore({
   *   playerGuid: 'abc-123',
   *   playerName: 'ACE',
   *   score: 1500,
   * });
   * console.log(result.rank, result.isNewHighScore);
   */
  async submitScore(options) {
    const leaderboard = options.leaderboard ?? this.defaultLeaderboard;
    const params = new URLSearchParams();
    if (leaderboard) params.set("leaderboard", leaderboard);
    const url = `${this.apiUrl}/api/v1/scores${params.toString() ? "?" + params.toString() : ""}`;
    const body = {
      player_guid: options.playerGuid,
      player_name: options.playerName,
      score: options.score,
      ...options.metadata && { metadata: options.metadata }
    };
    const raw = await this.request(url, {
      method: "POST",
      body: JSON.stringify(body)
    });
    return this.mapScoreResponse(raw);
  }
  // ============================================
  // LEADERBOARD
  // ============================================
  /**
   * Get a leaderboard. Supports pagination and version-based lookups for
   * time-based boards.
   *
   * @example
   * // Top 10 on default board
   * const lb = await client.getLeaderboard();
   *
   * // Top 25 on a specific board
   * const lb = await client.getLeaderboard({ leaderboard: 'Weekly', limit: 25 });
   *
   * // Historical version
   * const lb = await client.getLeaderboard({ leaderboard: 'Weekly', version: 3 });
   */
  async getLeaderboard(options) {
    const leaderboard = options?.leaderboard ?? this.defaultLeaderboard;
    const limit = options?.limit ?? 10;
    const offset = options?.offset ?? 0;
    const params = new URLSearchParams();
    params.set("limit", String(Math.min(limit, 100)));
    params.set("offset", String(offset));
    if (leaderboard) params.set("leaderboard", leaderboard);
    if (options?.version !== void 0) params.set("version", String(options.version));
    const url = `${this.apiUrl}/api/v1/leaderboard?${params.toString()}`;
    const raw = await this.request(url, { method: "GET" });
    return this.mapLeaderboardResponse(raw);
  }
  // ============================================
  // PLAYER
  // ============================================
  /**
   * Get a player's rank and score. Returns `null` if the player has no score.
   *
   * @example
   * const player = await client.getPlayerRank({ playerGuid: 'abc-123' });
   * if (player) console.log(`Rank #${player.rank}`);
   */
  async getPlayerRank(options) {
    const leaderboard = options.leaderboard ?? this.defaultLeaderboard;
    const params = new URLSearchParams();
    if (leaderboard) params.set("leaderboard", leaderboard);
    const url = `${this.apiUrl}/api/v1/player/${encodeURIComponent(options.playerGuid)}${params.toString() ? "?" + params.toString() : ""}`;
    try {
      const raw = await this.request(url, { method: "GET" });
      return this.mapPlayerResponse(raw);
    } catch (error) {
      if (error instanceof KeeperBoardError && error.code === "NOT_FOUND") {
        return null;
      }
      throw error;
    }
  }
  /**
   * Update a player's display name.
   *
   * @example
   * const player = await client.updatePlayerName({
   *   playerGuid: 'abc-123',
   *   newName: 'MAVERICK',
   * });
   */
  async updatePlayerName(options) {
    const leaderboard = options.leaderboard ?? this.defaultLeaderboard;
    const params = new URLSearchParams();
    if (leaderboard) params.set("leaderboard", leaderboard);
    const url = `${this.apiUrl}/api/v1/player/${encodeURIComponent(options.playerGuid)}${params.toString() ? "?" + params.toString() : ""}`;
    const raw = await this.request(url, {
      method: "PUT",
      body: JSON.stringify({ player_name: options.newName })
    });
    return this.mapPlayerResponse(raw);
  }
  // ============================================
  // CLAIM (for migrated scores)
  // ============================================
  /**
   * Claim a migrated score by matching player name.
   * Used when scores were imported without player GUIDs.
   */
  async claimScore(options) {
    const leaderboard = options.leaderboard ?? this.defaultLeaderboard;
    const params = new URLSearchParams();
    if (leaderboard) params.set("leaderboard", leaderboard);
    const url = `${this.apiUrl}/api/v1/claim${params.toString() ? "?" + params.toString() : ""}`;
    const raw = await this.request(url, {
      method: "POST",
      body: JSON.stringify({
        player_guid: options.playerGuid,
        player_name: options.playerName
      })
    });
    return this.mapClaimResponse(raw);
  }
  // ============================================
  // HEALTH CHECK
  // ============================================
  /**
   * Check if the API is healthy. Does not require an API key.
   */
  async healthCheck() {
    const url = `${this.apiUrl}/api/v1/health`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    const json = await response.json();
    if (!json.success) {
      throw new KeeperBoardError(json.error, json.code, response.status);
    }
    return json.data;
  }
  // ============================================
  // RESPONSE MAPPERS (snake_case → camelCase)
  // ============================================
  mapScoreResponse(raw) {
    return {
      id: raw.id,
      playerGuid: raw.player_guid,
      playerName: raw.player_name,
      score: raw.score,
      rank: raw.rank,
      isNewHighScore: raw.is_new_high_score
    };
  }
  mapLeaderboardResponse(raw) {
    return {
      entries: raw.entries.map((e) => ({
        rank: e.rank,
        playerGuid: e.player_guid,
        playerName: e.player_name,
        score: e.score
      })),
      totalCount: raw.total_count,
      resetSchedule: raw.reset_schedule,
      version: raw.version,
      oldestVersion: raw.oldest_version,
      nextReset: raw.next_reset
    };
  }
  mapPlayerResponse(raw) {
    return {
      id: raw.id,
      playerGuid: raw.player_guid,
      playerName: raw.player_name,
      score: raw.score,
      rank: raw.rank
    };
  }
  mapClaimResponse(raw) {
    return {
      claimed: raw.claimed,
      score: raw.score,
      rank: raw.rank,
      playerName: raw.player_name
    };
  }
  // ============================================
  // INTERNAL
  // ============================================
  async request(url, options) {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": this.apiKey
    };
    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers || {} }
    });
    const json = await response.json();
    if (!json.success) {
      throw new KeeperBoardError(json.error, json.code, response.status);
    }
    return json.data;
  }
};
_KeeperBoardClient.DEFAULT_API_URL = "https://keeperboard.vercel.app";
var KeeperBoardClient = _KeeperBoardClient;

// src/nameGenerator.ts
var MAX_BASE_LENGTH = 10;
var ADJECTIVES = [
  "Arcane",
  "Astro",
  "Blazing",
  "Bouncy",
  "Brassy",
  "Brisk",
  "Bubbly",
  "Chaotic",
  "Cheeky",
  "Chill",
  "Chunky",
  "Cloaked",
  "Cosmic",
  "Crimson",
  "Crispy",
  "Dashing",
  "Dizzy",
  "Dynamic",
  "Electric",
  "Epic",
  "Feisty",
  "Fiery",
  "Flashy",
  "Frosty",
  "Funky",
  "Furious",
  "Galactic",
  "Glitchy",
  "Golden",
  "Goofy",
  "Gritty",
  "Groovy",
  "Hyper",
  "Icy",
  "Inky",
  "Jazzy",
  "Jolly",
  "Jumpy",
  "Laser",
  "Legendary",
  "Loud",
  "Lucky",
  "Lunar",
  "Madcap",
  "Magic",
  "Majestic",
  "Meteor",
  "Mighty",
  "Minty",
  "Mystic",
  "Neon",
  "Nimble",
  "Nova",
  "Nuclear",
  "Omega",
  "Orbital",
  "Peppy",
  "Phantom",
  "Pixel",
  "Plasma",
  "Polished",
  "Primal",
  "Quantum",
  "Quick",
  "Radiant",
  "Rampaging",
  "Razor",
  "Rebel",
  "Retro",
  "Rogue",
  "Rowdy",
  "Savage",
  "Shadow",
  "Shiny",
  "Silly",
  "Sketchy",
  "Skybound",
  "Slick",
  "Snappy",
  "Solar",
  "Sonic",
  "Sparky",
  "Speedy",
  "Spiky",
  "Starry",
  "Stealthy",
  "Stormy",
  "Supreme",
  "Swift",
  "Thunder",
  "Turbo",
  "Twilight",
  "Ultra",
  "Vibrant",
  "Warped",
  "Wicked",
  "Wild",
  "Wizard",
  "Zappy",
  "Zesty"
];
var NOUNS = [
  "Aardvark",
  "Asteroid",
  "Badger",
  "Bandit",
  "Banshee",
  "Beacon",
  "Beetle",
  "Blaster",
  "Blob",
  "Boomer",
  "Bot",
  "Brawler",
  "Buccaneer",
  "Buffalo",
  "Cannon",
  "Captain",
  "Caribou",
  "Charger",
  "Cheetah",
  "Chimera",
  "Cobra",
  "Comet",
  "Cosmonaut",
  "Cougar",
  "Coyote",
  "Cyborg",
  "Dagger",
  "Defender",
  "Dino",
  "Dragon",
  "Drifter",
  "Drone",
  "Duck",
  "Eagle",
  "Eel",
  "Falcon",
  "Ferret",
  "Fireball",
  "Fox",
  "Fury",
  "Gazelle",
  "Ghost",
  "Gizmo",
  "Gladiator",
  "Goblin",
  "Griffin",
  "Hammer",
  "Hawk",
  "Hero",
  "Hydra",
  "Iguana",
  "Jaguar",
  "Jester",
  "Jetpack",
  "Jinx",
  "Kangaroo",
  "Katana",
  "Kraken",
  "Lancer",
  "Laser",
  "Legend",
  "Lemur",
  "Leopard",
  "Lion",
  "Luchador",
  "Lynx",
  "Maverick",
  "Meteor",
  "Monkey",
  "Monsoon",
  "Moose",
  "Ninja",
  "Nova",
  "Octopus",
  "Oracle",
  "Otter",
  "Panther",
  "Phoenix",
  "Pirate",
  "Pixel",
  "Puma",
  "Quasar",
  "Racer",
  "Raptor",
  "Raven",
  "Reactor",
  "Rocket",
  "Ronin",
  "Saber",
  "Scorpion",
  "Shark",
  "Spartan",
  "Sphinx",
  "Sprinter",
  "Stallion",
  "Tiger",
  "Titan",
  "Viking",
  "Viper",
  "Wizard"
];
function generatePlayerName() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const number = Math.floor(Math.random() * 99) + 1;
  const base = (adjective + noun).slice(0, MAX_BASE_LENGTH);
  return `${base}${number}`;
}

// src/PlayerIdentity.ts
var DEFAULT_KEY_PREFIX = "keeperboard_";
var PlayerIdentity = class {
  constructor(config = {}) {
    this.keyPrefix = config.keyPrefix ?? DEFAULT_KEY_PREFIX;
    this.guidKey = `${this.keyPrefix}player_guid`;
    this.nameKey = `${this.keyPrefix}player_name`;
    this.nameAutoKey = `${this.keyPrefix}player_name_auto`;
  }
  /**
   * Get the stored player GUID, or null if none exists.
   */
  getPlayerGuid() {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    return localStorage.getItem(this.guidKey);
  }
  /**
   * Set the player GUID in localStorage.
   */
  setPlayerGuid(guid) {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    localStorage.setItem(this.guidKey, guid);
  }
  /**
   * Get the stored player GUID, creating one if it doesn't exist.
   * Uses crypto.randomUUID() for generating new GUIDs.
   */
  getOrCreatePlayerGuid() {
    let guid = this.getPlayerGuid();
    if (!guid) {
      guid = this.generateUUID();
      this.setPlayerGuid(guid);
    }
    return guid;
  }
  /**
   * Get the stored player name, or null if none exists.
   */
  getPlayerName() {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    return localStorage.getItem(this.nameKey);
  }
  /**
   * Set the player name in localStorage.
   */
  setPlayerName(name) {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    localStorage.setItem(this.nameKey, name);
    localStorage.removeItem(this.nameAutoKey);
  }
  /**
   * Get the stored player name, creating an auto-generated one if it doesn't exist.
   * Uses AdjectiveNounNumber pattern (e.g., ArcaneBlob99).
   */
  getOrCreatePlayerName() {
    let name = this.getPlayerName();
    if (!name) {
      name = generatePlayerName();
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(this.nameKey, name);
        localStorage.setItem(this.nameAutoKey, "true");
      }
    }
    return name;
  }
  /**
   * Check if the current player name was auto-generated (vs explicitly set by user).
   */
  isAutoGeneratedName() {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }
    return localStorage.getItem(this.nameAutoKey) === "true";
  }
  /**
   * Clear all stored player identity data.
   */
  clear() {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    localStorage.removeItem(this.guidKey);
    localStorage.removeItem(this.nameKey);
    localStorage.removeItem(this.nameAutoKey);
  }
  /**
   * Check if player identity is stored.
   */
  hasIdentity() {
    return this.getPlayerGuid() !== null;
  }
  /**
   * Generate a UUID v4.
   * Uses crypto.randomUUID() if available, otherwise falls back to a manual implementation.
   */
  generateUUID() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
};

// src/Cache.ts
var Cache = class {
  constructor(ttlMs) {
    this.fetchedAt = 0;
    this.inflight = null;
    this.pendingRefresh = null;
    this.ttlMs = ttlMs;
  }
  /**
   * Get cached value if fresh, otherwise fetch via the provided function.
   * Deduplicates concurrent calls — only one fetch runs at a time.
   */
  async getOrFetch(fetchFn) {
    if (this.isFresh()) {
      return this.data;
    }
    if (this.inflight) {
      return this.inflight;
    }
    this.inflight = fetchFn().then((result) => {
      this.data = result;
      this.fetchedAt = Date.now();
      this.inflight = null;
      return result;
    }).catch((err) => {
      this.inflight = null;
      throw err;
    });
    return this.inflight;
  }
  /**
   * Trigger a background refresh without awaiting the result.
   * Returns immediately. If a fetch is already in flight, schedules
   * the refresh to run after the current one completes.
   */
  refreshInBackground(fetchFn) {
    if (this.inflight) {
      this.pendingRefresh = fetchFn;
      return;
    }
    this.startBackgroundFetch(fetchFn);
  }
  startBackgroundFetch(fetchFn) {
    this.inflight = fetchFn().then((result) => {
      this.data = result;
      this.fetchedAt = Date.now();
      this.inflight = null;
      if (this.pendingRefresh) {
        const pending = this.pendingRefresh;
        this.pendingRefresh = null;
        this.startBackgroundFetch(pending);
      }
      return result;
    }).catch((err) => {
      this.inflight = null;
      this.pendingRefresh = null;
      throw err;
    });
    this.inflight.catch(() => {
    });
  }
  /** Invalidate the cache, forcing the next getOrFetch to re-fetch. */
  invalidate() {
    this.fetchedAt = 0;
  }
  /** Get the cached value without fetching. Returns undefined if empty or stale. */
  get() {
    return this.isFresh() ? this.data : void 0;
  }
  /** Get the cached value even if stale. Returns undefined only if never fetched. */
  getStale() {
    return this.data;
  }
  /** Check if the cache has fresh (non-expired) data. */
  isFresh() {
    return this.data !== void 0 && Date.now() - this.fetchedAt < this.ttlMs;
  }
};

// src/RetryQueue.ts
var DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1e3;
var RetryQueue = class {
  constructor(storageKey, maxAgeMs = DEFAULT_MAX_AGE_MS) {
    this.storageKey = storageKey;
    this.maxAgeMs = maxAgeMs;
  }
  /** Save a failed score for later retry. */
  save(score, metadata) {
    try {
      const pending = { score, metadata, timestamp: Date.now() };
      localStorage.setItem(this.storageKey, JSON.stringify(pending));
    } catch {
    }
  }
  /**
   * Get the pending score, or null if none exists or it has expired.
   * Automatically clears expired entries.
   */
  get() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      const pending = JSON.parse(raw);
      if (Date.now() - pending.timestamp > this.maxAgeMs) {
        this.clear();
        return null;
      }
      return { score: pending.score, metadata: pending.metadata };
    } catch {
      return null;
    }
  }
  /** Check if there's a pending score. */
  hasPending() {
    return this.get() !== null;
  }
  /** Clear the pending score. */
  clear() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
    }
  }
};

// src/validation.ts
var DEFAULTS = {
  minLength: 2,
  maxLength: 12,
  uppercase: true,
  allowedPattern: /[^A-Z0-9_]/g
};
function validateName(input, options) {
  const opts = { ...DEFAULTS, ...options };
  let name = input.trim();
  if (opts.uppercase) {
    name = name.toUpperCase();
  }
  const pattern = options?.allowedPattern ?? (opts.uppercase ? /[^A-Z0-9_]/g : /[^A-Za-z0-9_]/g);
  name = name.replace(pattern, "");
  name = name.substring(0, opts.maxLength);
  if (name.length < opts.minLength) {
    return null;
  }
  return name;
}

// src/KeeperBoardSession.ts
var KeeperBoardSession = class {
  constructor(config) {
    this.cachedLimit = 0;
    // Track the limit used for cached data
    this.isSubmitting = false;
    this.client = new KeeperBoardClient({
      apiKey: config.apiKey,
      defaultLeaderboard: config.leaderboard,
      apiUrl: config.apiUrl
    });
    this.identity = new PlayerIdentity(config.identity);
    this.leaderboard = config.leaderboard;
    this.cache = config.cache ? new Cache(config.cache.ttlMs) : null;
    this.retryQueue = config.retry ? new RetryQueue(
      `keeperboard_retry_${config.leaderboard}`,
      config.retry.maxAgeMs
    ) : null;
  }
  // ============================================
  // IDENTITY
  // ============================================
  /** Get or create a persistent player GUID. */
  getPlayerGuid() {
    return this.identity.getOrCreatePlayerGuid();
  }
  /** Get the stored player name, auto-generating one if none exists. */
  getPlayerName() {
    return this.identity.getOrCreatePlayerName();
  }
  /** Store a player name locally. Does NOT update the server — call updatePlayerName() for that. */
  setPlayerName(name) {
    this.identity.setPlayerName(name);
  }
  /** Check if the player has explicitly set a name (vs auto-generated). */
  hasExplicitPlayerName() {
    return this.identity.getPlayerName() !== null && !this.identity.isAutoGeneratedName();
  }
  /** Validate a name using configurable rules. Returns sanitized string or null. */
  validateName(input, options) {
    return validateName(input, options);
  }
  // ============================================
  // CORE API
  // ============================================
  /**
   * Submit a score. Identity and leaderboard are auto-injected.
   * Returns a discriminated union: `{ success: true, rank, isNewHighScore }` or `{ success: false, error }`.
   *
   * If retry is enabled, failed submissions are saved to localStorage for later retry.
   * Prevents concurrent double-submissions.
   */
  async submitScore(score, metadata) {
    if (this.isSubmitting) {
      return { success: false, error: "Submission in progress" };
    }
    this.isSubmitting = true;
    try {
      const result = await this.client.submitScore({
        playerGuid: this.getPlayerGuid(),
        playerName: this.getPlayerName(),
        score,
        metadata
      });
      this.retryQueue?.clear();
      if (this.cache) {
        this.cache.invalidate();
        this.cachedLimit = 0;
        this.cache.refreshInBackground(() => this.fetchSnapshot());
      }
      return {
        success: true,
        rank: result.rank,
        isNewHighScore: result.isNewHighScore
      };
    } catch (error) {
      this.retryQueue?.save(score, metadata);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    } finally {
      this.isSubmitting = false;
    }
  }
  /**
   * Get a combined snapshot: leaderboard entries (with `isCurrentPlayer` flag)
   * plus the current player's rank if they're outside the top N.
   *
   * Uses cache if enabled and fresh. If a larger limit is requested than
   * what's cached, the cache is invalidated and fresh data is fetched.
   */
  async getSnapshot(options) {
    const limit = options?.limit ?? 10;
    if (this.cache) {
      if (limit > this.cachedLimit) {
        this.cache.invalidate();
      }
      const result = await this.cache.getOrFetch(() => this.fetchSnapshot(limit));
      this.cachedLimit = limit;
      return result;
    }
    return this.fetchSnapshot(limit);
  }
  /**
   * Update the player's name on the server and locally.
   * Returns true on success, false on failure.
   */
  async updatePlayerName(newName) {
    try {
      await this.client.updatePlayerName({
        playerGuid: this.getPlayerGuid(),
        newName
      });
      this.identity.setPlayerName(newName);
      if (this.cache) {
        this.cache.invalidate();
        this.cachedLimit = 0;
      }
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Retry submitting a pending score (from a previous failed submission).
   * Call this on app startup.
   */
  async retryPendingScore() {
    const pending = this.retryQueue?.get();
    if (!pending) return null;
    const result = await this.submitScore(pending.score, pending.metadata);
    if (result.success) {
      this.retryQueue?.clear();
    }
    return result;
  }
  /** Check if there's a pending score in the retry queue. */
  hasPendingScore() {
    return this.retryQueue?.hasPending() ?? false;
  }
  /**
   * Pre-fetch snapshot data in the background for instant display later.
   * No-op if cache is disabled or already fresh.
   */
  prefetch() {
    if (!this.cache) return;
    if (this.cache.isFresh()) return;
    this.cache.refreshInBackground(() => this.fetchSnapshot());
  }
  /** Escape hatch: access the underlying KeeperBoardClient. */
  getClient() {
    return this.client;
  }
  // ============================================
  // INTERNAL
  // ============================================
  async fetchSnapshot(limit = 10) {
    const playerGuid = this.getPlayerGuid();
    const [leaderboard, playerRank] = await Promise.all([
      this.client.getLeaderboard({ limit }),
      this.client.getPlayerRank({ playerGuid })
    ]);
    const entries = leaderboard.entries.map((e) => ({
      rank: e.rank,
      playerGuid: e.playerGuid,
      playerName: e.playerName,
      score: e.score,
      isCurrentPlayer: e.playerGuid === playerGuid
    }));
    const playerInEntries = entries.some((e) => e.isCurrentPlayer);
    const effectivePlayerRank = playerRank && !playerInEntries ? playerRank : null;
    return {
      entries,
      totalCount: leaderboard.totalCount,
      playerRank: effectivePlayerRank
    };
  }
};
export {
  Cache,
  KeeperBoardClient,
  KeeperBoardError,
  KeeperBoardSession,
  PlayerIdentity,
  RetryQueue,
  generatePlayerName,
  validateName
};
