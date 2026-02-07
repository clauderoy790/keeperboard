/**
 * Helper class for managing player identity in localStorage.
 * Provides persistent player GUID and name storage across game sessions.
 */

const DEFAULT_KEY_PREFIX = 'keeperboard_';

export interface PlayerIdentityConfig {
  /** Prefix for localStorage keys (default: "keeperboard_") */
  keyPrefix?: string;
}

export class PlayerIdentity {
  private readonly keyPrefix: string;
  private readonly guidKey: string;
  private readonly nameKey: string;

  constructor(config: PlayerIdentityConfig = {}) {
    this.keyPrefix = config.keyPrefix ?? DEFAULT_KEY_PREFIX;
    this.guidKey = `${this.keyPrefix}player_guid`;
    this.nameKey = `${this.keyPrefix}player_name`;
  }

  /**
   * Get the stored player GUID, or null if none exists.
   */
  getPlayerGuid(): string | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return localStorage.getItem(this.guidKey);
  }

  /**
   * Set the player GUID in localStorage.
   */
  setPlayerGuid(guid: string): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    localStorage.setItem(this.guidKey, guid);
  }

  /**
   * Get the stored player GUID, creating one if it doesn't exist.
   * Uses crypto.randomUUID() for generating new GUIDs.
   */
  getOrCreatePlayerGuid(): string {
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
  getPlayerName(): string | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return localStorage.getItem(this.nameKey);
  }

  /**
   * Set the player name in localStorage.
   */
  setPlayerName(name: string): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    localStorage.setItem(this.nameKey, name);
  }

  /**
   * Clear all stored player identity data.
   */
  clear(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    localStorage.removeItem(this.guidKey);
    localStorage.removeItem(this.nameKey);
  }

  /**
   * Check if player identity is stored.
   */
  hasIdentity(): boolean {
    return this.getPlayerGuid() !== null;
  }

  /**
   * Generate a UUID v4.
   * Uses crypto.randomUUID() if available, otherwise falls back to a manual implementation.
   */
  private generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
