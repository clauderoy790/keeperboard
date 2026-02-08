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
var KeeperBoardClient = class {
  constructor(config) {
    this.apiUrl = config.apiUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }
  async submitScore(playerGuid, playerName, score, leaderboard, metadata) {
    const params = new URLSearchParams();
    if (leaderboard) {
      params.set("leaderboard", leaderboard);
    }
    const url = `${this.apiUrl}/api/v1/scores${params.toString() ? "?" + params.toString() : ""}`;
    const body = {
      player_guid: playerGuid,
      player_name: playerName,
      score,
      ...metadata && { metadata }
    };
    return this.request(url, {
      method: "POST",
      body: JSON.stringify(body)
    });
  }
  async getLeaderboard(name, limit = 10, offset = 0) {
    const params = new URLSearchParams();
    params.set("limit", String(Math.min(limit, 100)));
    params.set("offset", String(offset));
    if (name) {
      params.set("leaderboard", name);
    }
    const url = `${this.apiUrl}/api/v1/leaderboard?${params.toString()}`;
    return this.request(url, { method: "GET" });
  }
  async getLeaderboardVersion(name, version, limit = 10, offset = 0) {
    const params = new URLSearchParams();
    params.set("leaderboard", name);
    params.set("version", String(version));
    params.set("limit", String(Math.min(limit, 100)));
    params.set("offset", String(offset));
    const url = `${this.apiUrl}/api/v1/leaderboard?${params.toString()}`;
    return this.request(url, { method: "GET" });
  }
  async getPlayerRank(playerGuid, leaderboard) {
    const params = new URLSearchParams();
    if (leaderboard) {
      params.set("leaderboard", leaderboard);
    }
    const url = `${this.apiUrl}/api/v1/player/${encodeURIComponent(playerGuid)}${params.toString() ? "?" + params.toString() : ""}`;
    try {
      return await this.request(url, { method: "GET" });
    } catch (error) {
      if (error instanceof KeeperBoardError && error.code === "NOT_FOUND") {
        return null;
      }
      throw error;
    }
  }
  async updatePlayerName(playerGuid, newName, leaderboard) {
    const params = new URLSearchParams();
    if (leaderboard) {
      params.set("leaderboard", leaderboard);
    }
    const url = `${this.apiUrl}/api/v1/player/${encodeURIComponent(playerGuid)}${params.toString() ? "?" + params.toString() : ""}`;
    return this.request(url, {
      method: "PUT",
      body: JSON.stringify({ player_name: newName })
    });
  }
  async claimScore(playerGuid, playerName, leaderboard) {
    const params = new URLSearchParams();
    if (leaderboard) {
      params.set("leaderboard", leaderboard);
    }
    const url = `${this.apiUrl}/api/v1/claim${params.toString() ? "?" + params.toString() : ""}`;
    return this.request(url, {
      method: "POST",
      body: JSON.stringify({
        player_guid: playerGuid,
        player_name: playerName
      })
    });
  }
  // ============================================
  // HEALTH CHECK
  // ============================================
  /**
   * Check if the API is healthy.
   * This endpoint does not require an API key.
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

// src/PlayerIdentity.ts
var DEFAULT_KEY_PREFIX = "keeperboard_";
var PlayerIdentity = class {
  constructor(config = {}) {
    this.keyPrefix = config.keyPrefix ?? DEFAULT_KEY_PREFIX;
    this.guidKey = `${this.keyPrefix}player_guid`;
    this.nameKey = `${this.keyPrefix}player_name`;
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
export {
  KeeperBoardClient,
  KeeperBoardError,
  PlayerIdentity
};
