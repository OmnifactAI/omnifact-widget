import { ConfigManager } from '../utils/config-manager.js';
import { StorageService } from '../services/storage-service.js';
import { ApiClient } from '../services/api-client.js';
import { SSEHandler } from '../services/sse-handler.js';

/**
 * Main Omnifact Chat Widget component.
 * Orchestrates all child components and manages state.
 */
export class OmnifactChatWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this._state = {
      isOpen: false,
      messages: [],
      isTyping: false,
      sessionId: null
    };

    this._config = null;
    this._storage = null;
    this._apiClient = null;
    this._sseHandler = new SSEHandler();

    // Component references
    this._bubble = null;
    this._window = null;
    this._messageList = null;
    this._chatInput = null;
    this._typingIndicator = null;
  }

  static get observedAttributes() {
    return [
      'endpoint-url',
      'endpoint-id',
      'api-key',
      'position',
      'title',
      'welcome-message',
      'primary-color',
      'secondary-color',
      'background-color',
      'text-color',
      'enable-inline-sources',
      'enable-agentic-workflow',
      'debug'
    ];
  }

  connectedCallback() {
    // Load configuration
    const configManager = new ConfigManager(this);
    this._config = configManager.load();

    // Initialize storage
    this._storage = new StorageService(this._config.storageKey);

    // Initialize API client
    this._apiClient = new ApiClient(this._config);

    // Set debug mode on SSE handler and global flag
    this._sseHandler.setDebug(this._config.debug);
    if (this._config.debug) {
      window.omnifactDebug = true;
    }

    // Restore state from storage
    this._initializeSession();

    // Render the widget
    this.render();

    // Get component references
    this._setupComponentReferences();

    // Apply theme
    this._applyTheme();

    // Render messages
    this._renderMessages();

    // Setup event listeners
    this._setupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue) return;

    // Reload configuration
    const configManager = new ConfigManager(this);
    this._config = configManager.load();

    // Update API client
    if (this._apiClient) {
      this._apiClient.updateConfig(this._config);
    }

    // Update theme
    this._applyTheme();

    // Update specific components based on changed attribute
    if (name === 'title' && this._window) {
      this._window.setAttribute('title', this._config.title);
    }

    if (name === 'position') {
      this._updatePosition();
    }

    // Update debug mode on SSE handler
    if (name === 'debug' && this._sseHandler) {
      this._sseHandler.setDebug(this._config.debug);
    }
  }

  /**
   * Initialize or restore the chat session.
   */
  _initializeSession() {
    if (this._config.enablePersistence) {
      const stored = this._storage.getState();
      this._state.sessionId = stored.sessionId;
      this._state.messages = stored.messages || [];
    } else {
      this._state.sessionId = this._generateSessionId();
      this._state.messages = [];
    }

    // Add welcome message if no messages exist
    if (this._state.messages.length === 0 && this._config.welcomeMessage) {
      this._state.messages.push({
        id: 'welcome',
        role: 'assistant',
        content: this._config.welcomeMessage,
        timestamp: Date.now(),
        isWelcome: true
      });
    }
  }

  _generateSessionId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return 'session-' + crypto.randomUUID();
    }
    return 'session-' + Math.random().toString(36).substring(2, 11);
  }

  _setupComponentReferences() {
    // Upgrade all custom elements in the shadow DOM to ensure they have their methods
    customElements.upgrade(this.shadowRoot);

    this._bubble = this.shadowRoot.querySelector('omnifact-chat-bubble');
    this._window = this.shadowRoot.querySelector('omnifact-chat-window');
    this._messageList = this.shadowRoot.querySelector('omnifact-message-list');
    this._chatInput = this.shadowRoot.querySelector('omnifact-chat-input');
    this._typingIndicator = this.shadowRoot.querySelector('omnifact-typing-indicator');
  }

  _applyTheme() {
    const { primaryColor, secondaryColor, backgroundColor, textColor } = this._config;

    // Apply to host
    this.style.setProperty('--omnifact-primary', primaryColor);
    this.style.setProperty('--omnifact-secondary', secondaryColor);
    this.style.setProperty('--omnifact-background', backgroundColor);
    this.style.setProperty('--omnifact-text', textColor);

    // Apply to bubble
    if (this._bubble && this._bubble.primaryColor !== undefined) {
      this._bubble.primaryColor = primaryColor;
    }

    // Apply to window
    if (this._window && typeof this._window.setTheme === 'function') {
      this._window.setTheme(this._config);
    }

    // Apply to message list
    if (this._messageList && typeof this._messageList.setTheme === 'function') {
      this._messageList.setTheme(this._config);
    }

    // Apply to input
    if (this._chatInput && typeof this._chatInput.setTheme === 'function') {
      this._chatInput.setTheme(this._config);
    }

    // Apply to typing indicator
    if (this._typingIndicator && typeof this._typingIndicator.setTheme === 'function') {
      this._typingIndicator.setTheme(this._config);
    }
  }

  _updatePosition() {
    const position = this._config.position;
    if (this._window) {
      this._window.setAttribute('position', position);
    }
  }

  _setupEventListeners() {
    // Toggle chat window
    this._bubble.addEventListener('toggle', () => {
      this._toggleChat();
    });

    // Close window
    this._window.addEventListener('close', () => {
      this._closeChat();
    });

    // Clear history
    this._window.addEventListener('clear', () => {
      this.clearHistory();
    });

    // Send message
    this._chatInput.addEventListener('send', (e) => {
      this._sendMessage(e.detail.message);
    });
  }

  /**
   * Toggle the chat window open/closed.
   */
  _toggleChat() {
    this._state.isOpen = !this._state.isOpen;
    this._updateChatVisibility();
  }

  /**
   * Open the chat window.
   */
  open() {
    this._state.isOpen = true;
    this._updateChatVisibility();
  }

  /**
   * Close the chat window.
   */
  _closeChat() {
    this._state.isOpen = false;
    this._updateChatVisibility();
  }

  close() {
    this._closeChat();
  }

  _updateChatVisibility() {
    const isOpen = this._state.isOpen;

    if (isOpen) {
      this._window.removeAttribute('hidden');
      this._bubble.hasUnread = false;
      // Focus input after animation
      setTimeout(() => {
        this._chatInput.focus();
        this._messageList.scrollToBottom(false);
      }, 100);
    } else {
      this._window.setAttribute('hidden', '');
    }

    this._bubble.isOpen = isOpen;
  }

  /**
   * Render existing messages.
   */
  _renderMessages() {
    // Clear existing
    const slot = this._messageList;
    const existingMessages = slot.querySelectorAll('omnifact-message-item');
    existingMessages.forEach(el => el.remove());

    // Render each message
    for (const msg of this._state.messages) {
      this._renderMessage(msg);
    }

    // Scroll to bottom after messages are rendered (wait for next frame)
    setTimeout(() => {
      this._messageList.scrollToBottom(false);
    }, 50);
  }

  /**
   * Render a single message.
   */
  _renderMessage(msg, isStreaming = false) {
    const messageEl = document.createElement('omnifact-message-item');
    messageEl.setAttribute('role', msg.role);
    messageEl.setAttribute('data-id', msg.id);
    messageEl.setAttribute('data-content', msg.content || '');
    if (isStreaming) {
      messageEl.setAttribute('streaming', '');
    }

    // Append to DOM
    this._messageList.appendChild(messageEl);

    // Set content and references after a microtask to ensure element is fully initialized
    Promise.resolve().then(() => {
      // Set sources first so citations are processed correctly
      if (msg.sources) {
        messageEl.sources = msg.sources;
      }
      if (msg.references) {
        messageEl.references = msg.references;
      }
      messageEl.content = msg.content;
    });

    return messageEl;
  }

  /**
   * Send a message to the assistant.
   */
  async _sendMessage(text) {
    if (!text.trim() || this._state.isTyping) return;

    // Add user message
    const userMessage = {
      id: this._generateMessageId(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now()
    };

    this._state.messages.push(userMessage);
    this._renderMessage(userMessage);

    // Disable input and show typing
    this._chatInput.disabled = true;
    this._state.isTyping = true;
    this._typingIndicator.show();

    // Scroll to bottom after typing indicator is shown
    setTimeout(() => {
      this._messageList.scrollToBottom();
    }, 50);

    // Prepare messages for API (exclude welcome message metadata)
    const apiMessages = this._state.messages
      .filter(m => !m.isWelcome)
      .map(m => ({
        role: m.role,
        content: m.content
      }));

    try {
      // Create placeholder for assistant message
      const assistantMessage = {
        id: this._generateMessageId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      };

      // Start streaming request
      const response = await this._apiClient.sendMessage(apiMessages, true);

      // Hide typing indicator once we start receiving
      this._typingIndicator.hide();

      // Add placeholder message to state
      this._state.messages.push(assistantMessage);

      // Render streaming message
      const messageEl = this._renderMessage(assistantMessage, true);

      // Track if we should auto-scroll
      let shouldScroll = true;

      // Process the stream
      await this._sseHandler.processStream(response, {
        onChunk: (chunk, accumulated, messageId) => {
          assistantMessage.content = accumulated;
          if (messageId) assistantMessage.id = messageId;
          messageEl.appendContent(chunk);

          // Auto-scroll if user is near bottom
          if (shouldScroll && this._messageList.isNearBottom()) {
            this._messageList.scrollToBottom();
          }
        },
        onReferences: (refs) => {
          // Store references in message and update UI
          assistantMessage.references = refs;
          messageEl.references = refs;
        },
        onSource: (source) => {
          // Accumulate sources
          if (!assistantMessage.sources) {
            assistantMessage.sources = [];
          }
          assistantMessage.sources.push(source);
          messageEl.sources = assistantMessage.sources;
        },
        onComplete: (result) => {
          assistantMessage.content = result.content;
          if (result.messageId) assistantMessage.id = result.messageId;
          if (result.references) {
            assistantMessage.references = result.references;
            messageEl.references = result.references;
          }
          if (result.sources) {
            assistantMessage.sources = result.sources;
            messageEl.sources = result.sources;
          }
          messageEl.removeAttribute('streaming');

          // Final content update with citations processed
          messageEl.content = result.content;

          // Save to storage
          this._saveState();
        },
        onError: (error) => {
          console.error('[OmnifactWidget] Stream error:', error);
        }
      });
    } catch (error) {
      console.error('[OmnifactWidget] Failed to send message:', error);

      // Show error message
      const errorMessage = {
        id: this._generateMessageId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
        isError: true
      };

      this._state.messages.push(errorMessage);
      this._renderMessage(errorMessage);
    } finally {
      // Re-enable input
      this._chatInput.disabled = false;
      this._state.isTyping = false;
      this._typingIndicator.hide();
      this._chatInput.focus();

      // Save state (including user message)
      this._saveState();
    }
  }

  _generateMessageId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return 'msg-' + crypto.randomUUID();
    }
    return 'msg-' + Math.random().toString(36).substring(2, 11);
  }

  /**
   * Save current state to storage.
   */
  _saveState() {
    if (this._config.enablePersistence && this._storage) {
      this._storage.saveState({
        sessionId: this._state.sessionId,
        messages: this._state.messages
      });
    }
  }

  /**
   * Clear chat history and start fresh.
   */
  clearHistory() {
    this._state.messages = [];

    // Add welcome message
    if (this._config.welcomeMessage) {
      this._state.messages.push({
        id: 'welcome',
        role: 'assistant',
        content: this._config.welcomeMessage,
        timestamp: Date.now(),
        isWelcome: true
      });
    }

    // Clear storage
    if (this._storage) {
      this._storage.clearState();
    }

    // Re-render
    this._renderMessages();
  }

  /**
   * Programmatically send a message.
   */
  sendMessage(text) {
    if (!this._state.isOpen) {
      this.open();
    }
    this._sendMessage(text);
  }

  render() {
    const position = this._config.position || 'bottom-right';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --omnifact-primary: ${this._config.primaryColor};
          --omnifact-secondary: ${this._config.secondaryColor};
          --omnifact-background: ${this._config.backgroundColor};
          --omnifact-text: ${this._config.textColor};

          position: fixed;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }

        :host([position="bottom-right"]),
        :host(:not([position])) {
          bottom: 20px;
          right: 20px;
        }

        :host([position="bottom-left"]) {
          bottom: 20px;
          left: 20px;
        }

        .container {
          position: relative;
        }
      </style>

      <div class="container">
        <omnifact-chat-window
          title="${this._config.title}"
          hidden
          position="${position}"
        >
          <omnifact-message-list></omnifact-message-list>
          <omnifact-typing-indicator hidden></omnifact-typing-indicator>
          <omnifact-chat-input></omnifact-chat-input>
        </omnifact-chat-window>

        <omnifact-chat-bubble></omnifact-chat-bubble>
      </div>
    `;

    // Set position attribute on host
    this.setAttribute('position', position);
  }
}
