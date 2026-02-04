import { ConfigManager } from '../utils/config-manager';
import { StorageService } from '../services/storage-service';
import { ApiClient } from '../services/api-client';
import { SSEHandler } from '../services/sse-handler';
import type { WidgetConfig, ChatMessage, ApiMessage, InlineSource, LegacyReferences } from '../types';
import type { ChatBubble } from './chat-bubble';
import type { ChatWindow } from './chat-window';
import type { MessageList } from './message-list';
import type { ChatInput } from './chat-input';
import type { TypingIndicator } from './typing-indicator';
import type { MessageItem } from './message-item';

interface WidgetState {
  isOpen: boolean;
  messages: ChatMessage[];
  isTyping: boolean;
  sessionId: string | null;
}

/**
 * Main Omnifact Chat Widget component.
 * Orchestrates all child components and manages state.
 */
export class OmnifactChatWidget extends HTMLElement {
  private _state: WidgetState = {
    isOpen: false,
    messages: [],
    isTyping: false,
    sessionId: null
  };

  private _config: WidgetConfig | null = null;
  private _storage: StorageService | null = null;
  private _apiClient: ApiClient | null = null;
  private _sseHandler = new SSEHandler();

  // Component references
  private _bubble: ChatBubble | null = null;
  private _window: ChatWindow | null = null;
  private _messageList: MessageList | null = null;
  private _chatInput: ChatInput | null = null;
  private _typingIndicator: TypingIndicator | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes(): string[] {
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
      'hide-sources',
      'debug'
    ];
  }

  connectedCallback(): void {
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

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
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
    if (name === 'title' && this._window && this._config) {
      this._window.setAttribute('title', this._config.title);
    }

    if (name === 'position') {
      this._updatePosition();
    }

    // Update debug mode on SSE handler
    if (name === 'debug' && this._sseHandler && this._config) {
      this._sseHandler.setDebug(this._config.debug);
    }
  }

  /**
   * Initialize or restore the chat session.
   */
  private _initializeSession(): void {
    if (!this._config || !this._storage) return;

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

  private _generateSessionId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return 'session-' + crypto.randomUUID();
    }
    return 'session-' + Math.random().toString(36).substring(2, 11);
  }

  private _setupComponentReferences(): void {
    if (!this.shadowRoot) return;

    // Upgrade all custom elements in the shadow DOM to ensure they have their methods
    customElements.upgrade(this.shadowRoot);

    this._bubble = this.shadowRoot.querySelector('omnifact-chat-bubble') as ChatBubble | null;
    this._window = this.shadowRoot.querySelector('omnifact-chat-window') as ChatWindow | null;
    this._messageList = this.shadowRoot.querySelector('omnifact-message-list') as MessageList | null;
    this._chatInput = this.shadowRoot.querySelector('omnifact-chat-input') as ChatInput | null;
    this._typingIndicator = this.shadowRoot.querySelector('omnifact-typing-indicator') as TypingIndicator | null;
  }

  private _applyTheme(): void {
    if (!this._config) return;

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

  private _updatePosition(): void {
    if (!this._config) return;

    const position = this._config.position;
    if (this._window) {
      this._window.setAttribute('position', position);
    }
  }

  private _setupEventListeners(): void {
    // Toggle chat window
    this._bubble?.addEventListener('toggle', () => {
      this._toggleChat();
    });

    // Close window
    this._window?.addEventListener('close', () => {
      this._closeChat();
    });

    // Clear history
    this._window?.addEventListener('clear', () => {
      this.clearHistory();
    });

    // Send message
    this._chatInput?.addEventListener('send', ((e: CustomEvent<{ message: string }>) => {
      this._sendMessage(e.detail.message);
    }) as EventListener);
  }

  /**
   * Toggle the chat window open/closed.
   */
  private _toggleChat(): void {
    this._state.isOpen = !this._state.isOpen;
    this._updateChatVisibility();
  }

  /**
   * Open the chat window.
   */
  open(): void {
    this._state.isOpen = true;
    this._updateChatVisibility();
  }

  /**
   * Close the chat window.
   */
  private _closeChat(): void {
    this._state.isOpen = false;
    this._updateChatVisibility();
  }

  close(): void {
    this._closeChat();
  }

  private _updateChatVisibility(): void {
    const isOpen = this._state.isOpen;

    if (isOpen) {
      this._window?.removeAttribute('hidden');
      if (this._bubble) this._bubble.hasUnread = false;
      // Focus input after animation
      setTimeout(() => {
        this._chatInput?.focus();
        this._messageList?.scrollToBottom(false);
      }, 100);
    } else {
      this._window?.setAttribute('hidden', '');
    }

    if (this._bubble) this._bubble.isOpen = isOpen;
  }

  /**
   * Render existing messages.
   */
  private _renderMessages(): void {
    if (!this._messageList) return;

    // Clear existing
    const existingMessages = this._messageList.querySelectorAll('omnifact-message-item');
    existingMessages.forEach(el => el.remove());

    // Render each message
    for (const msg of this._state.messages) {
      this._renderMessage(msg);
    }

    // Scroll to bottom after messages are rendered (wait for next frame)
    setTimeout(() => {
      this._messageList?.scrollToBottom(false);
    }, 50);
  }

  /**
   * Render a single message.
   */
  private _renderMessage(msg: ChatMessage, isStreaming = false): MessageItem | null {
    if (!this._messageList) return null;

    const messageEl = document.createElement('omnifact-message-item') as MessageItem;
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
      // Set hideSources flag first
      if (this._config?.hideSources) {
        messageEl.hideSources = true;
      }
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
  private async _sendMessage(text: string): Promise<void> {
    if (!text.trim() || this._state.isTyping || !this._apiClient) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: this._generateMessageId(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now()
    };

    this._state.messages.push(userMessage);
    this._renderMessage(userMessage);

    // Disable input and show typing
    if (this._chatInput) this._chatInput.disabled = true;
    this._state.isTyping = true;
    this._typingIndicator?.show();

    // Scroll to bottom after typing indicator is shown
    setTimeout(() => {
      this._messageList?.scrollToBottom();
    }, 50);

    // Prepare messages for API (exclude welcome message metadata)
    const apiMessages: ApiMessage[] = this._state.messages
      .filter(m => !m.isWelcome)
      .map(m => ({
        role: m.role,
        content: m.content
      }));

    try {
      // Create placeholder for assistant message
      const assistantMessage: ChatMessage = {
        id: this._generateMessageId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      };

      // Start streaming request
      const response = await this._apiClient.sendMessage(apiMessages, true);

      // Hide typing indicator once we start receiving
      this._typingIndicator?.hide();

      // Add placeholder message to state
      this._state.messages.push(assistantMessage);

      // Render streaming message
      const messageEl = this._renderMessage(assistantMessage, true);

      // Set hideSources immediately for streaming messages
      if (messageEl && this._config?.hideSources) {
        messageEl.hideSources = true;
      }

      // Track if we should auto-scroll
      const shouldScroll = true;

      // Process the stream
      await this._sseHandler.processStream(response, {
        onChunk: (chunk: string, accumulated: string, messageId: string | null) => {
          assistantMessage.content = accumulated;
          if (messageId) assistantMessage.id = messageId;
          messageEl?.appendContent(chunk);

          // Auto-scroll if user is near bottom
          if (shouldScroll && this._messageList?.isNearBottom()) {
            this._messageList.scrollToBottom();
          }
        },
        onReferences: (refs: LegacyReferences) => {
          // Store references in message and update UI
          assistantMessage.references = refs;
          if (messageEl) messageEl.references = refs;
        },
        onSource: (source: InlineSource) => {
          // Accumulate sources
          if (!assistantMessage.sources) {
            assistantMessage.sources = [];
          }
          assistantMessage.sources.push(source);
          if (messageEl) messageEl.sources = assistantMessage.sources;
        },
        onComplete: (result) => {
          assistantMessage.content = result.content;
          if (result.messageId) assistantMessage.id = result.messageId;
          if (result.references) {
            assistantMessage.references = result.references;
            if (messageEl) messageEl.references = result.references;
          }
          if (result.sources) {
            assistantMessage.sources = result.sources;
            if (messageEl) messageEl.sources = result.sources;
          }
          messageEl?.removeAttribute('streaming');

          // Final content update with citations processed
          if (messageEl) messageEl.content = result.content;

          // Save to storage
          this._saveState();
        },
        onError: (error: Error) => {
          console.error('[OmnifactWidget] Stream error:', error);
        }
      });
    } catch (error) {
      console.error('[OmnifactWidget] Failed to send message:', error);

      // Show error message
      const errorMessage: ChatMessage = {
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
      if (this._chatInput) this._chatInput.disabled = false;
      this._state.isTyping = false;
      this._typingIndicator?.hide();
      this._chatInput?.focus();

      // Save state (including user message)
      this._saveState();
    }
  }

  private _generateMessageId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return 'msg-' + crypto.randomUUID();
    }
    return 'msg-' + Math.random().toString(36).substring(2, 11);
  }

  /**
   * Save current state to storage.
   */
  private _saveState(): void {
    if (this._config?.enablePersistence && this._storage) {
      this._storage.saveState({
        sessionId: this._state.sessionId,
        messages: this._state.messages
      });
    }
  }

  /**
   * Clear chat history and start fresh.
   */
  clearHistory(): void {
    this._state.messages = [];

    // Add welcome message
    if (this._config?.welcomeMessage) {
      this._state.messages.push({
        id: 'welcome',
        role: 'assistant',
        content: this._config.welcomeMessage,
        timestamp: Date.now(),
        isWelcome: true
      });
    }

    // Clear storage
    this._storage?.clearState();

    // Re-render
    this._renderMessages();
  }

  /**
   * Programmatically send a message.
   */
  sendMessage(text: string): void {
    if (!this._state.isOpen) {
      this.open();
    }
    this._sendMessage(text);
  }

  private render(): void {
    if (!this.shadowRoot || !this._config) return;

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
