"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  KeeperBoardClient: () => KeeperBoardClient,
  KeeperBoardError: () => KeeperBoardError,
  PlayerIdentity: () => PlayerIdentity
});
module.exports = __toCommonJS(index_exports);

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
  /**
   * Submit a score to the leaderboard.
   * Only updates if the new score is higher than the existing one.
   *
   * @param playerGuid - Unique player identifier
   * @param playerName - Player display name
   * @param score - Score value
   * @param metadata - Optional metadata to attach
   * @param leaderboardSlug - Optional leaderboard slug (uses default if not specified)
   * @returns Score response with rank and whether it's a new high score
   */
  async submitScore(playerGuid, playerName, score, metadata, leaderboardSlug) {
    const params = new URLSearchParams();
    if (leaderboardSlug) {
      params.set("leaderboard", leaderboardSlug);
    }
    const url = `${this.apiUrl}/api/v1/scores${params.toString() ? "?" + params.toString() : ""}`;
    const body = {
      player_guid: playerGuid,
      player_name: playerName,
      score,
      ...metadata && { metadata }
    };
    const response = await this.request(url, {
      method: "POST",
      body: JSON.stringify(body)
    });
    return response;
  }
  /**
   * Get the leaderboard entries with pagination.
   *
   * @param limit - Maximum number of entries to return (default: 10, max: 100)
   * @param offset - Pagination offset (default: 0)
   * @param leaderboardSlug - Optional leaderboard slug (uses default if not specified)
   * @returns Leaderboard entries with total count
   */
  async getLeaderboard(limit = 10, offset = 0, leaderboardSlug) {
    const params = new URLSearchParams();
    params.set("limit", String(Math.min(limit, 100)));
    params.set("offset", String(offset));
    if (leaderboardSlug) {
      params.set("leaderboard", leaderboardSlug);
    }
    const url = `${this.apiUrl}/api/v1/leaderboard?${params.toString()}`;
    return this.request(url, {
      method: "GET"
    });
  }
  /**
   * Get a specific player's score and rank.
   *
   * @param playerGuid - Player's unique identifier
   * @param leaderboardSlug - Optional leaderboard slug (uses default if not specified)
   * @returns Player's score and rank, or null if not found
   */
  async getPlayer(playerGuid, leaderboardSlug) {
    const params = new URLSearchParams();
    if (leaderboardSlug) {
      params.set("leaderboard", leaderboardSlug);
    }
    const url = `${this.apiUrl}/api/v1/player/${encodeURIComponent(playerGuid)}${params.toString() ? "?" + params.toString() : ""}`;
    try {
      return await this.request(url, {
        method: "GET"
      });
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
   * @param playerGuid - Player's unique identifier
   * @param newName - New display name
   * @param leaderboardSlug - Optional leaderboard slug (uses default if not specified)
   * @returns Updated player info
   */
  async updatePlayerName(playerGuid, newName, leaderboardSlug) {
    const params = new URLSearchParams();
    if (leaderboardSlug) {
      params.set("leaderboard", leaderboardSlug);
    }
    const url = `${this.apiUrl}/api/v1/player/${encodeURIComponent(playerGuid)}${params.toString() ? "?" + params.toString() : ""}`;
    return this.request(url, {
      method: "PUT",
      body: JSON.stringify({ player_name: newName })
    });
  }
  /**
   * Claim a migrated score by matching player name.
   * Used when scores were imported (e.g., from CSV) without player GUIDs.
   *
   * @param playerGuid - Player GUID to assign to the claimed score
   * @param playerName - Player name to match against migrated scores
   * @param leaderboardSlug - Optional leaderboard slug (uses default if not specified)
   * @returns Claim result with score and rank
   */
  async claimScore(playerGuid, playerName, leaderboardSlug) {
    const params = new URLSearchParams();
    if (leaderboardSlug) {
      params.set("leaderboard", leaderboardSlug);
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
  /**
   * Check if the API is healthy.
   * This endpoint does not require an API key.
   *
   * @returns Health status with version and timestamp
   */
  async healthCheck() {
    const url = `${this.apiUrl}/api/v1/health`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });
    const json = await response.json();
    if (!json.success) {
      throw new KeeperBoardError(json.error, json.code, response.status);
    }
    return json.data;
  }
  /**
   * Internal request helper with auth and error handling.
   */
  async request(url, options) {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": this.apiKey
    };
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers || {}
      }
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  KeeperBoardClient,
  KeeperBoardError,
  PlayerIdentity
});
