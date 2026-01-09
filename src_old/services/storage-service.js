/**
 * Storage service for persisting chat state to localStorage.
 * Handles session management, message history, and cleanup.
 */
export class StorageService {
  static MAX_MESSAGES = 100;
  static MAX_MESSAGE_LENGTH = 10000;
  static SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  constructor(storageKey = 'omnifact-chat') {
    this.storageKey = storageKey;
  }

  /**
   * Get the stored state from localStorage.
   * @returns {Object} Stored state or default state
   */
  getState() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) {
        return this._getDefaultState();
      }

      const parsed = JSON.parse(data);

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
   * @param {Object} state - State to save
   */
  saveState(state) {
    try {
      // Trim messages to limit
      const messages = state.messages
        .slice(-StorageService.MAX_MESSAGES)
        .map(m => ({
          ...m,
          content: m.content?.slice(0, StorageService.MAX_MESSAGE_LENGTH) || ''
        }));

      const data = {
        sessionId: state.sessionId,
        messages,
        lastUpdated: Date.now(),
        version: 1
      };

      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
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
  clearState() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.warn('[OmnifactWidget] Failed to clear chat state:', e);
    }
  }

  /**
   * Check if a session is still valid.
   * @param {Object} state - Stored state
   * @returns {boolean} True if session is valid
   */
  _isSessionValid(state) {
    if (!state.lastUpdated) {
      return false;
    }
    return (Date.now() - state.lastUpdated) < StorageService.SESSION_TIMEOUT;
  }

  /**
   * Get the default state for a new session.
   * @returns {Object} Default state
   */
  _getDefaultState() {
    return {
      sessionId: this._generateSessionId(),
      messages: [],
      lastUpdated: null,
      version: 1
    };
  }

  /**
   * Generate a unique session ID.
   * @returns {string} Session ID
   */
  _generateSessionId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return 'session-' + crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'session-' + Math.random().toString(36).substring(2, 11) +
           Math.random().toString(36).substring(2, 11);
  }

  /**
   * Handle quota exceeded error by clearing old data.
   * @param {Object} state - State to save
   */
  _handleQuotaExceeded(state) {
    try {
      // Keep only the most recent half of messages
      const messages = state.messages.slice(-Math.floor(StorageService.MAX_MESSAGES / 2));
      const data = {
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
