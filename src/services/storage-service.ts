import type { StoredState, ChatMessage } from '../types';

interface StoredData extends StoredState {
  lastUpdated: number | null;
  version: number;
}

/**
 * Storage service for persisting chat state to localStorage.
 * Handles session management, message history, and cleanup.
 */
export class StorageService {
  static readonly MAX_MESSAGES = 100;
  static readonly MAX_MESSAGE_LENGTH = 10000;
  static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  private storageKey: string;

  constructor(storageKey = 'omnifact-chat') {
    this.storageKey = storageKey;
  }

  /**
   * Get the stored state from localStorage.
   */
  getState(): StoredState {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) {
        return this._getDefaultState();
      }

      const parsed = JSON.parse(data) as StoredData;

      // Check if session is still valid
      if (!this._isSessionValid(parsed)) {
        this.clearState();
        return this._getDefaultState();
      }

      return parsed;
    } catch (e) {
      console.warn('[OmnifactWidget] Failed to load chat state:', e);
      return this._getDefaultState();
    }
  }

  /**
   * Save state to localStorage.
   */
  saveState(state: StoredState): void {
    try {
      // Trim messages to limit
      const messages: ChatMessage[] = state.messages
        .slice(-StorageService.MAX_MESSAGES)
        .map(m => ({
          ...m,
          content: m.content?.slice(0, StorageService.MAX_MESSAGE_LENGTH) || ''
        }));

      const data: StoredData = {
        sessionId: state.sessionId,
        messages,
        lastUpdated: Date.now(),
        version: 1
      };

      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        // Clear old data and retry with fewer messages
        this._handleQuotaExceeded(state);
      } else {
        console.warn('[OmnifactWidget] Failed to save chat state:', e);
      }
    }
  }

  /**
   * Clear all stored state.
   */
  clearState(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.warn('[OmnifactWidget] Failed to clear chat state:', e);
    }
  }

  /**
   * Check if a session is still valid.
   */
  private _isSessionValid(state: StoredData): boolean {
    if (!state.lastUpdated) {
      return false;
    }
    return (Date.now() - state.lastUpdated) < StorageService.SESSION_TIMEOUT;
  }

  /**
   * Get the default state for a new session.
   */
  private _getDefaultState(): StoredState {
    return {
      sessionId: this._generateSessionId(),
      messages: []
    };
  }

  /**
   * Generate a unique session ID.
   */
  private _generateSessionId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return 'session-' + crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'session-' + Math.random().toString(36).substring(2, 11) +
           Math.random().toString(36).substring(2, 11);
  }

  /**
   * Handle quota exceeded error by clearing old data.
   */
  private _handleQuotaExceeded(state: StoredState): void {
    try {
      // Keep only the most recent half of messages
      const messages = state.messages.slice(-Math.floor(StorageService.MAX_MESSAGES / 2));
      const data: StoredData = {
        sessionId: state.sessionId,
        messages,
        lastUpdated: Date.now(),
        version: 1
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('[OmnifactWidget] Failed to save chat state after cleanup:', e);
    }
  }
}
