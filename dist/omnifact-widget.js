var OmnifactWidget = (function (exports) {
    'use strict';

    /**
     * Configuration manager for the Omnifact Chat Widget.
     * Handles loading configuration from JSON script tags and HTML attributes.
     * Priority: HTML attributes > JSON config > defaults
     */
    class ConfigManager {
        constructor(element) {
            this.element = element;
            this.config = { ...ConfigManager.defaults };
        }
        /**
         * Load and merge configuration from all sources.
         */
        load() {
            // 1. Load from JSON script tag inside the element
            this._loadFromJsonScript();
            // 2. Override with HTML attributes
            this._loadFromAttributes();
            // 3. Validate required fields
            this._validate();
            return this.config;
        }
        /**
         * Load configuration from a JSON script tag inside the element.
         */
        _loadFromJsonScript() {
            const script = this.element.querySelector('script[type="application/json"]');
            if (script) {
                try {
                    const jsonConfig = JSON.parse(script.textContent || '{}');
                    Object.assign(this.config, this._normalizeConfig(jsonConfig));
                }
                catch (e) {
                    console.error('[OmnifactWidget] Invalid JSON configuration:', e);
                }
            }
        }
        /**
         * Load configuration from HTML attributes.
         */
        _loadFromAttributes() {
            for (const [attr, prop] of Object.entries(ConfigManager.attributeMap)) {
                const value = this.element.getAttribute(attr);
                if (value !== null) {
                    // Handle boolean attributes
                    if (ConfigManager.booleanAttributes.includes(prop)) {
                        this.config[prop] = value !== 'false';
                    }
                    else {
                        this.config[prop] = value;
                    }
                }
            }
        }
        /**
         * Normalize JSON keys to camelCase and handle boolean conversions.
         */
        _normalizeConfig(json) {
            const normalized = {};
            for (const [key, value] of Object.entries(json)) {
                // Convert kebab-case to camelCase
                const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                // Handle boolean string conversions for boolean attributes
                if (ConfigManager.booleanAttributes.includes(camelKey) && typeof value === 'string') {
                    normalized[camelKey] = value !== 'false';
                }
                else {
                    normalized[camelKey] = value;
                }
            }
            return normalized;
        }
        /**
         * Validate required configuration fields.
         */
        _validate() {
            const warnings = [];
            if (!this.config.endpointUrl) {
                warnings.push('endpoint-url is required');
            }
            if (!this.config.endpointId) {
                warnings.push('endpoint-id is required');
            }
            if (warnings.length > 0) {
                console.warn('[OmnifactWidget] Configuration warnings:', warnings.join(', '));
            }
        }
        /**
         * Update a single configuration value.
         */
        set(key, value) {
            if (key in ConfigManager.defaults) {
                this.config[key] = value;
            }
        }
        /**
         * Get the current configuration.
         */
        get() {
            return { ...this.config };
        }
    }
    ConfigManager.defaults = {
        endpointUrl: '',
        endpointId: '',
        apiKey: '',
        position: 'bottom-right',
        title: 'Chat with us',
        welcomeMessage: 'Hello! How can I help you today?',
        primaryColor: '#6366f1',
        secondaryColor: '#818cf8',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        storageKey: 'omnifact-chat',
        enablePersistence: true,
        enableInlineSources: false,
        enableAgenticWorkflow: false,
        debug: false
    };
    ConfigManager.attributeMap = {
        'endpoint-url': 'endpointUrl',
        'endpoint-id': 'endpointId',
        'api-key': 'apiKey',
        'position': 'position',
        'title': 'title',
        'welcome-message': 'welcomeMessage',
        'primary-color': 'primaryColor',
        'secondary-color': 'secondaryColor',
        'background-color': 'backgroundColor',
        'text-color': 'textColor',
        'storage-key': 'storageKey',
        'enable-persistence': 'enablePersistence',
        'enable-inline-sources': 'enableInlineSources',
        'enable-agentic-workflow': 'enableAgenticWorkflow',
        'debug': 'debug'
    };
    ConfigManager.booleanAttributes = [
        'enablePersistence',
        'enableInlineSources',
        'enableAgenticWorkflow',
        'debug'
    ];

    /**
     * Storage service for persisting chat state to localStorage.
     * Handles session management, message history, and cleanup.
     */
    class StorageService {
        constructor(storageKey = 'omnifact-chat') {
            this.storageKey = storageKey;
        }
        /**
         * Get the stored state from localStorage.
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
            }
            catch (e) {
                console.warn('[OmnifactWidget] Failed to load chat state:', e);
                return this._getDefaultState();
            }
        }
        /**
         * Save state to localStorage.
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
            }
            catch (e) {
                if (e instanceof Error && e.name === 'QuotaExceededError') {
                    // Clear old data and retry with fewer messages
                    this._handleQuotaExceeded(state);
                }
                else {
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
            }
            catch (e) {
                console.warn('[OmnifactWidget] Failed to clear chat state:', e);
            }
        }
        /**
         * Check if a session is still valid.
         */
        _isSessionValid(state) {
            if (!state.lastUpdated) {
                return false;
            }
            return (Date.now() - state.lastUpdated) < StorageService.SESSION_TIMEOUT;
        }
        /**
         * Get the default state for a new session.
         */
        _getDefaultState() {
            return {
                sessionId: this._generateSessionId(),
                messages: []
            };
        }
        /**
         * Generate a unique session ID.
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
            }
            catch (e) {
                console.warn('[OmnifactWidget] Failed to save chat state after cleanup:', e);
            }
        }
    }
    StorageService.MAX_MESSAGES = 100;
    StorageService.MAX_MESSAGE_LENGTH = 10000;
    StorageService.SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

    /**
     * API client for communicating with the Omnifact chat endpoint.
     * Handles both streaming and non-streaming requests.
     */
    class ApiClient {
        constructor(config) {
            this.baseUrl = config.endpointUrl;
            this.endpointId = config.endpointId;
            this.apiKey = config.apiKey;
            this.enableInlineSources = config.enableInlineSources || false;
            this.enableAgenticWorkflow = config.enableAgenticWorkflow || false;
            this.debug = config.debug || false;
        }
        async sendMessage(messages, streaming = true) {
            const url = `${this.baseUrl}/v1/endpoints/${this.endpointId}/chat`;
            const headers = {
                'Content-Type': 'application/json'
            };
            // Only add API key header if provided
            if (this.apiKey) {
                headers['X-API-Key'] = this.apiKey;
            }
            // Add inline sources header if enabled
            if (this.enableInlineSources) {
                headers['omnifact-enable-inline-sources'] = 'true';
            }
            // Add agentic workflow header if enabled
            if (this.enableAgenticWorkflow) {
                headers['omnifact-enable-agentic-workflow'] = 'true';
            }
            if (this.debug) {
                console.log('[API Debug] Request URL:', url);
                console.log('[API Debug] Request headers:', headers);
                console.log('[API Debug] Request body:', { messages, streaming });
            }
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    messages: messages.map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    streaming
                })
            });
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new ApiError(`API request failed: ${response.status}`, response.status, errorText);
            }
            if (streaming) {
                return response;
            }
            return response.json();
        }
        /**
         * Update configuration (e.g., after attribute changes).
         */
        updateConfig(config) {
            if (config.endpointUrl)
                this.baseUrl = config.endpointUrl;
            if (config.endpointId)
                this.endpointId = config.endpointId;
            if (config.apiKey)
                this.apiKey = config.apiKey;
            if (config.enableInlineSources !== undefined)
                this.enableInlineSources = config.enableInlineSources;
            if (config.enableAgenticWorkflow !== undefined)
                this.enableAgenticWorkflow = config.enableAgenticWorkflow;
            if (config.debug !== undefined)
                this.debug = config.debug;
        }
    }
    /**
     * Custom error class for API errors.
     */
    class ApiError extends Error {
        constructor(message, status, responseText) {
            super(message);
            this.name = 'ApiError';
            this.status = status;
            this.responseText = responseText;
        }
    }

    /**
     * Server-Sent Events (SSE) handler for processing streaming responses.
     * Parses the Omnifact SSE format and emits content chunks.
     */
    class SSEHandler {
        constructor() {
            this.debug = false;
        }
        /**
         * Enable or disable debug logging.
         */
        setDebug(enabled) {
            this.debug = enabled;
        }
        /**
         * Log a debug message if debug mode is enabled.
         */
        _log(label, data) {
            if (this.debug) {
                console.log(`[SSE Debug] ${label}:`, data);
            }
        }
        /**
         * Process a streaming response.
         */
        async processStream(response, callbacks) {
            const { onChunk, onReferences, onSource, onComplete, onError } = callbacks;
            if (this.debug) {
                console.log('[SSE Debug] Starting stream processing...');
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let currentEvent = null;
            let accumulatedContent = '';
            let messageId = null;
            let references = null;
            const sources = [];
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) {
                            // Empty line - event boundary
                            continue;
                        }
                        if (trimmedLine.startsWith('event: ')) {
                            currentEvent = trimmedLine.slice(7).trim();
                            this._log('Event', currentEvent);
                            continue;
                        }
                        if (trimmedLine.startsWith('id: ')) {
                            // Skip ID lines
                            continue;
                        }
                        if (trimmedLine.startsWith('data: ')) {
                            const dataStr = trimmedLine.slice(6);
                            if (currentEvent === 'assistant_write') {
                                try {
                                    const data = JSON.parse(dataStr);
                                    this._log('assistant_write', data);
                                    if (data.content) {
                                        messageId = data.messageId || messageId;
                                        accumulatedContent += data.content;
                                        if (onChunk) {
                                            onChunk(data.content, accumulatedContent, messageId);
                                        }
                                    }
                                }
                                catch {
                                    // If not valid JSON, treat as raw content
                                    this._log('assistant_write (raw)', dataStr);
                                    accumulatedContent += dataStr;
                                    if (onChunk) {
                                        onChunk(dataStr, accumulatedContent, messageId);
                                    }
                                }
                            }
                            else if (currentEvent === 'references') {
                                // Legacy references format
                                try {
                                    const data = JSON.parse(dataStr);
                                    this._log('references', data);
                                    references = data;
                                    if (onReferences) {
                                        onReferences(data);
                                    }
                                }
                                catch (e) {
                                    console.warn('[SSEHandler] Failed to parse references:', e);
                                }
                            }
                            else if (currentEvent === 'message_source') {
                                // Inline source format
                                try {
                                    const data = JSON.parse(dataStr);
                                    this._log('message_source', data);
                                    sources.push(data);
                                    if (onSource) {
                                        onSource(data);
                                    }
                                }
                                catch (e) {
                                    console.warn('[SSEHandler] Failed to parse source:', e);
                                }
                            }
                            else if (currentEvent === 'done') {
                                // Stream complete
                                const result = {
                                    content: accumulatedContent,
                                    messageId,
                                    references,
                                    sources: sources.length > 0 ? sources : null
                                };
                                this._log('done', result);
                                if (onComplete) {
                                    onComplete(result);
                                }
                                return result;
                            }
                            else if (currentEvent === 'error') {
                                this._log('error', dataStr);
                                try {
                                    const errorData = JSON.parse(dataStr);
                                    throw new Error(errorData.message || 'Stream error');
                                }
                                catch (e) {
                                    if (e instanceof Error && e.message !== 'Stream error')
                                        throw e;
                                    throw new Error(dataStr || 'Stream error');
                                }
                            }
                            else {
                                // Log unknown event types
                                this._log(`unknown event (${currentEvent})`, dataStr);
                            }
                        }
                    }
                }
                // If we reach here without a done event, still complete
                const result = {
                    content: accumulatedContent,
                    messageId,
                    references,
                    sources: sources.length > 0 ? sources : null
                };
                if (onComplete) {
                    onComplete(result);
                }
                return result;
            }
            catch (error) {
                if (onError && error instanceof Error) {
                    onError(error);
                }
                throw error;
            }
        }
    }

    /**
     * Main Omnifact Chat Widget component.
     * Orchestrates all child components and manages state.
     */
    class OmnifactChatWidget extends HTMLElement {
        constructor() {
            super();
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
            this.attachShadow({ mode: 'open' });
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
            if (!this.isConnected || oldValue === newValue)
                return;
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
        _initializeSession() {
            if (!this._config || !this._storage)
                return;
            if (this._config.enablePersistence) {
                const stored = this._storage.getState();
                this._state.sessionId = stored.sessionId;
                this._state.messages = stored.messages || [];
            }
            else {
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
            if (!this.shadowRoot)
                return;
            // Upgrade all custom elements in the shadow DOM to ensure they have their methods
            customElements.upgrade(this.shadowRoot);
            this._bubble = this.shadowRoot.querySelector('omnifact-chat-bubble');
            this._window = this.shadowRoot.querySelector('omnifact-chat-window');
            this._messageList = this.shadowRoot.querySelector('omnifact-message-list');
            this._chatInput = this.shadowRoot.querySelector('omnifact-chat-input');
            this._typingIndicator = this.shadowRoot.querySelector('omnifact-typing-indicator');
        }
        _applyTheme() {
            if (!this._config)
                return;
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
            if (!this._config)
                return;
            const position = this._config.position;
            if (this._window) {
                this._window.setAttribute('position', position);
            }
        }
        _setupEventListeners() {
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
            this._chatInput?.addEventListener('send', ((e) => {
                this._sendMessage(e.detail.message);
            }));
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
                this._window?.removeAttribute('hidden');
                if (this._bubble)
                    this._bubble.hasUnread = false;
                // Focus input after animation
                setTimeout(() => {
                    this._chatInput?.focus();
                    this._messageList?.scrollToBottom(false);
                }, 100);
            }
            else {
                this._window?.setAttribute('hidden', '');
            }
            if (this._bubble)
                this._bubble.isOpen = isOpen;
        }
        /**
         * Render existing messages.
         */
        _renderMessages() {
            if (!this._messageList)
                return;
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
        _renderMessage(msg, isStreaming = false) {
            if (!this._messageList)
                return null;
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
            if (!text.trim() || this._state.isTyping || !this._apiClient)
                return;
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
            if (this._chatInput)
                this._chatInput.disabled = true;
            this._state.isTyping = true;
            this._typingIndicator?.show();
            // Scroll to bottom after typing indicator is shown
            setTimeout(() => {
                this._messageList?.scrollToBottom();
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
                this._typingIndicator?.hide();
                // Add placeholder message to state
                this._state.messages.push(assistantMessage);
                // Render streaming message
                const messageEl = this._renderMessage(assistantMessage, true);
                // Track if we should auto-scroll
                const shouldScroll = true;
                // Process the stream
                await this._sseHandler.processStream(response, {
                    onChunk: (chunk, accumulated, messageId) => {
                        assistantMessage.content = accumulated;
                        if (messageId)
                            assistantMessage.id = messageId;
                        messageEl?.appendContent(chunk);
                        // Auto-scroll if user is near bottom
                        if (shouldScroll && this._messageList?.isNearBottom()) {
                            this._messageList.scrollToBottom();
                        }
                    },
                    onReferences: (refs) => {
                        // Store references in message and update UI
                        assistantMessage.references = refs;
                        if (messageEl)
                            messageEl.references = refs;
                    },
                    onSource: (source) => {
                        // Accumulate sources
                        if (!assistantMessage.sources) {
                            assistantMessage.sources = [];
                        }
                        assistantMessage.sources.push(source);
                        if (messageEl)
                            messageEl.sources = assistantMessage.sources;
                    },
                    onComplete: (result) => {
                        assistantMessage.content = result.content;
                        if (result.messageId)
                            assistantMessage.id = result.messageId;
                        if (result.references) {
                            assistantMessage.references = result.references;
                            if (messageEl)
                                messageEl.references = result.references;
                        }
                        if (result.sources) {
                            assistantMessage.sources = result.sources;
                            if (messageEl)
                                messageEl.sources = result.sources;
                        }
                        messageEl?.removeAttribute('streaming');
                        // Final content update with citations processed
                        if (messageEl)
                            messageEl.content = result.content;
                        // Save to storage
                        this._saveState();
                    },
                    onError: (error) => {
                        console.error('[OmnifactWidget] Stream error:', error);
                    }
                });
            }
            catch (error) {
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
            }
            finally {
                // Re-enable input
                if (this._chatInput)
                    this._chatInput.disabled = false;
                this._state.isTyping = false;
                this._typingIndicator?.hide();
                this._chatInput?.focus();
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
        clearHistory() {
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
        sendMessage(text) {
            if (!this._state.isOpen) {
                this.open();
            }
            this._sendMessage(text);
        }
        render() {
            if (!this.shadowRoot || !this._config)
                return;
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

    /**
     * Floating chat bubble component.
     * Displays a circular button that triggers the chat window.
     */
    class ChatBubble extends HTMLElement {
        constructor() {
            super();
            this._hasUnread = false;
            this._isOpen = false;
            this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
            this.render();
            this._setupEventListeners();
        }
        /**
         * Set whether there are unread messages (shows pulse animation).
         */
        set hasUnread(value) {
            this._hasUnread = value;
            const bubble = this.shadowRoot?.querySelector('.bubble');
            if (bubble) {
                bubble.classList.toggle('pulse', value);
            }
        }
        get hasUnread() {
            return this._hasUnread;
        }
        /**
         * Set the primary color of the bubble.
         */
        set primaryColor(value) {
            this.style.setProperty('--bubble-color', value);
        }
        /**
         * Set whether the chat is currently open (changes icon).
         */
        set isOpen(value) {
            this._isOpen = value;
            const chatIcon = this.shadowRoot?.querySelector('.chat-icon');
            const closeIcon = this.shadowRoot?.querySelector('.close-icon');
            if (chatIcon && closeIcon) {
                chatIcon.style.display = value ? 'none' : 'block';
                closeIcon.style.display = value ? 'block' : 'none';
            }
        }
        get isOpen() {
            return this._isOpen;
        }
        _setupEventListeners() {
            const bubble = this.shadowRoot?.querySelector('.bubble');
            bubble?.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('toggle', {
                    bubbles: true,
                    composed: true
                }));
            });
        }
        render() {
            if (!this.shadowRoot)
                return;
            this.shadowRoot.innerHTML = `
      <style>
        :host {
          --bubble-color: #6366f1;
          display: block;
        }

        .bubble {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--bubble-color);
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 0;
        }

        .bubble:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }

        .bubble:active {
          transform: scale(0.95);
        }

        .bubble.pulse::after {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: var(--bubble-color);
          animation: pulse 2s infinite;
          z-index: -1;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.7;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        .icon {
          width: 28px;
          height: 28px;
          fill: white;
        }

        .close-icon {
          display: none;
        }
      </style>

      <button class="bubble" aria-label="Open chat">
        <svg class="icon chat-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
          <path d="M7 9h10v2H7zm0-3h10v2H7z"/>
        </svg>
        <svg class="icon close-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    `;
        }
    }

    /**
     * Chat window component.
     * Container for the chat interface including header, messages, and input.
     */
    class ChatWindow extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }
        static get observedAttributes() {
            return ['title', 'hidden'];
        }
        connectedCallback() {
            this.render();
            this._setupEventListeners();
        }
        attributeChangedCallback(name, _oldValue, newValue) {
            if (name === 'title' && this.isConnected) {
                const titleEl = this.shadowRoot?.querySelector('.header-title');
                if (titleEl) {
                    titleEl.textContent = newValue || 'Chat';
                }
            }
        }
        /**
         * Set theme colors.
         */
        setTheme(config) {
            if (config.primaryColor)
                this.style.setProperty('--primary-color', config.primaryColor);
            if (config.backgroundColor)
                this.style.setProperty('--background-color', config.backgroundColor);
            if (config.textColor)
                this.style.setProperty('--text-color', config.textColor);
        }
        _setupEventListeners() {
            const closeBtn = this.shadowRoot?.querySelector('.close-btn');
            closeBtn?.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('close', {
                    bubbles: true,
                    composed: true
                }));
            });
            const clearBtn = this.shadowRoot?.querySelector('.clear-btn');
            clearBtn?.addEventListener('click', () => {
                this.dispatchEvent(new CustomEvent('clear', {
                    bubbles: true,
                    composed: true
                }));
            });
        }
        render() {
            if (!this.shadowRoot)
                return;
            const title = this.getAttribute('title') || 'Chat';
            this.shadowRoot.innerHTML = `
      <style>
        :host {
          --primary-color: #6366f1;
          --background-color: #ffffff;
          --text-color: #1f2937;
          --border-color: #e5e7eb;

          display: flex;
          flex-direction: column;
          position: absolute;
          bottom: 76px;
          right: 0;
          width: 380px;
          height: 600px;
          max-height: calc(100vh - 100px);
          max-width: calc(100vw - 40px);
          background: var(--background-color);
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          transform-origin: bottom right;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }

        :host([hidden]) {
          display: flex;
          transform: scale(0.9) translateY(10px);
          opacity: 0;
          pointer-events: none;
        }

        :host([position="bottom-left"]) {
          right: auto;
          left: 0;
          transform-origin: bottom left;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: var(--primary-color);
          color: white;
          flex-shrink: 0;
        }

        .header-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .header-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .header-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .header-btn svg {
          width: 18px;
          height: 18px;
          fill: white;
        }

        .content {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow: hidden;
        }

        ::slotted(omnifact-message-list) {
          flex: 1;
          min-height: 0;
        }

        ::slotted(omnifact-typing-indicator) {
          flex-shrink: 0;
        }

        ::slotted(omnifact-chat-input) {
          flex-shrink: 0;
        }
      </style>

      <div class="header">
        <h2 class="header-title">${title}</h2>
        <div class="header-actions">
          <button class="header-btn clear-btn" aria-label="Clear chat history" title="Clear chat">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>
          <button class="header-btn close-btn" aria-label="Close chat">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="content">
        <slot></slot>
      </div>
    `;
        }
    }

    /**
     * Message list component.
     * Scrollable container for chat messages.
     */
    class MessageList extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
            this.render();
        }
        /**
         * Scroll to the bottom of the message list.
         */
        scrollToBottom(smooth = true) {
            const container = this.shadowRoot?.querySelector('.messages');
            if (container) {
                // Use scrollTop assignment for more reliable scrolling
                if (smooth) {
                    container.scrollTo({
                        top: container.scrollHeight,
                        behavior: 'smooth'
                    });
                }
                else {
                    container.scrollTop = container.scrollHeight;
                }
            }
        }
        /**
         * Check if the user is near the bottom of the list.
         */
        isNearBottom() {
            const container = this.shadowRoot?.querySelector('.messages');
            if (!container)
                return true;
            const threshold = 100;
            return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
        }
        /**
         * Set theme colors.
         */
        setTheme(config) {
            if (config.backgroundColor) {
                this.style.setProperty('--background-color', config.backgroundColor);
            }
        }
        render() {
            if (!this.shadowRoot)
                return;
            this.shadowRoot.innerHTML = `
      <style>
        :host {
          --background-color: #ffffff;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--background-color);
        }

        .messages::-webkit-scrollbar {
          width: 6px;
        }

        .messages::-webkit-scrollbar-track {
          background: transparent;
        }

        .messages::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }

        .messages::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        ::slotted(*) {
          flex-shrink: 0;
        }
      </style>

      <div class="messages">
        <slot></slot>
      </div>
    `;
        }
    }

    /**
     * Lightweight markdown renderer for chat messages.
     * Supports common markdown elements without external dependencies.
     */
    class MarkdownRenderer {
        constructor(options = {}) {
            this.options = {
                sanitize: true,
                linkTarget: '_blank',
                ...options
            };
        }
        /**
         * Render markdown text to HTML.
         */
        render(text) {
            if (!text)
                return '';
            let html = this.options.sanitize ? this._escapeHtml(text) : text;
            // Process in order of specificity (code blocks first to avoid conflicts)
            html = this._renderCodeBlocks(html);
            html = this._renderInlineCode(html);
            html = this._renderHeaders(html);
            html = this._renderBold(html);
            html = this._renderItalic(html);
            html = this._renderLinks(html);
            html = this._renderLists(html);
            html = this._renderLineBreaks(html);
            return html;
        }
        /**
         * Escape HTML special characters.
         */
        _escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
        }
        /**
         * Render fenced code blocks.
         * ```lang
         * code
         * ```
         */
        _renderCodeBlocks(text) {
            return text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
                const langClass = lang ? ` class="language-${lang}"` : '';
                return `<pre><code${langClass}>${code.trim()}</code></pre>`;
            });
        }
        /**
         * Render inline code.
         * `code`
         */
        _renderInlineCode(text) {
            return text.replace(/`([^`]+)`/g, '<code>$1</code>');
        }
        /**
         * Render headers.
         * # H1, ## H2, ### H3
         */
        _renderHeaders(text) {
            return text
                .replace(/^### (.+)$/gm, '<h4>$1</h4>')
                .replace(/^## (.+)$/gm, '<h3>$1</h3>')
                .replace(/^# (.+)$/gm, '<h2>$1</h2>');
        }
        /**
         * Render bold text.
         * **bold** or __bold__
         */
        _renderBold(text) {
            return text.replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_, g1, g2) => `<strong>${g1 || g2}</strong>`);
        }
        /**
         * Render italic text.
         * *italic* or _italic_ (but not within words)
         */
        _renderItalic(text) {
            // Match *text* but not **text** (already handled)
            return text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
        }
        /**
         * Render links.
         * [text](url)
         */
        _renderLinks(text) {
            const target = this.options.linkTarget;
            return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" target="${target}" rel="noopener noreferrer">$1</a>`);
        }
        /**
         * Render unordered lists.
         * - item or * item
         */
        _renderLists(text) {
            const lines = text.split('\n');
            const result = [];
            let inList = false;
            for (const line of lines) {
                const listMatch = line.match(/^[\-\*]\s+(.+)$/);
                if (listMatch) {
                    if (!inList) {
                        result.push('<ul>');
                        inList = true;
                    }
                    result.push(`<li>${listMatch[1]}</li>`);
                }
                else {
                    if (inList) {
                        result.push('</ul>');
                        inList = false;
                    }
                    result.push(line);
                }
            }
            if (inList) {
                result.push('</ul>');
            }
            return result.join('\n');
        }
        /**
         * Convert line breaks to <br> tags.
         */
        _renderLineBreaks(text) {
            // Don't add <br> inside pre/code blocks or after block elements
            return text
                .split('\n')
                .map((line, i, arr) => {
                // Skip if this is part of a code block or list
                if (line.startsWith('<pre>') || line.startsWith('<ul>') ||
                    line.startsWith('</pre>') || line.startsWith('</ul>') ||
                    line.startsWith('<li>') || line.startsWith('<h')) {
                    return line;
                }
                // Add <br> if next line isn't a block element
                const nextLine = arr[i + 1];
                if (nextLine && !nextLine.startsWith('<') && line.trim()) {
                    return line + '<br>';
                }
                return line;
            })
                .join('\n');
        }
    }

    /**
     * Individual message component.
     * Displays a single chat message with markdown rendering.
     */
    class MessageItem extends HTMLElement {
        constructor() {
            super();
            this._content = '';
            this._references = null;
            this._sources = null;
            this._markdownRenderer = new MarkdownRenderer();
            this.attachShadow({ mode: 'open' });
        }
        static get observedAttributes() {
            return ['role', 'streaming', 'data-content'];
        }
        connectedCallback() {
            // Check for content from data attribute first
            const dataContent = this.getAttribute('data-content');
            if (dataContent && !this._content) {
                this._content = dataContent;
            }
            this.render();
        }
        attributeChangedCallback(name, _oldValue, newValue) {
            if (this.isConnected) {
                if (name === 'streaming') {
                    // Just update the streaming class, don't re-render everything
                    const messageEl = this.shadowRoot?.querySelector('.message');
                    if (messageEl) {
                        if (newValue !== null) {
                            messageEl.classList.add('streaming');
                        }
                        else {
                            messageEl.classList.remove('streaming');
                        }
                    }
                }
                else {
                    this.render();
                }
            }
        }
        /**
         * Set the message content.
         */
        set content(value) {
            this._content = value || '';
            this._updateContent();
        }
        get content() {
            return this._content;
        }
        /**
         * Append content to the message (for streaming).
         */
        appendContent(chunk) {
            this._content += chunk;
            this._updateContent();
        }
        /**
         * Set document references (legacy format).
         */
        set references(value) {
            if (window.omnifactDebug) {
                console.log('[MessageItem Debug] Setting references:', value);
            }
            this._references = value;
            this._updateReferences();
        }
        get references() {
            return this._references;
        }
        /**
         * Set inline sources.
         */
        set sources(value) {
            if (window.omnifactDebug) {
                console.log('[MessageItem Debug] Setting sources:', value);
            }
            this._sources = value;
            this._updateReferences();
        }
        get sources() {
            return this._sources;
        }
        /**
         * Set theme colors.
         */
        setTheme(config) {
            if (config.primaryColor)
                this.style.setProperty('--primary-color', config.primaryColor);
            if (config.textColor)
                this.style.setProperty('--text-color', config.textColor);
        }
        /**
         * Update just the content area (more efficient than full re-render).
         */
        _updateContent() {
            if (!this.shadowRoot)
                return;
            const contentEl = this.shadowRoot.querySelector('.content');
            if (contentEl) {
                // First render markdown, then process citations
                let renderedContent = this._markdownRenderer.render(this._content);
                if (this._sources && this._sources.length > 0) {
                    renderedContent = this._processCitations(renderedContent);
                }
                contentEl.innerHTML = renderedContent;
            }
        }
        /**
         * Process :cite[sourceId] markers and replace with numbered citations.
         */
        _processCitations(content) {
            if (!this._sources)
                return content;
            // Create a map of sourceId to index
            const sourceMap = new Map();
            this._sources.forEach((source, index) => {
                sourceMap.set(source.sourceId, index + 1);
            });
            // Replace :cite[sourceId] with [n] links
            return content.replace(/:cite\[([^\]]+)\]/g, (match, sourceId) => {
                const num = sourceMap.get(sourceId);
                if (num) {
                    return `<sup class="citation" data-source="${sourceId}">[${num}]</sup>`;
                }
                return match;
            });
        }
        /**
         * Update the references section.
         */
        _updateReferences() {
            if (!this.shadowRoot) {
                if (window.omnifactDebug)
                    console.log('[MessageItem Debug] _updateReferences: no shadowRoot');
                return;
            }
            let refsEl = this.shadowRoot.querySelector('.references');
            // Create references element if it doesn't exist
            if (!refsEl) {
                const bubble = this.shadowRoot.querySelector('.bubble');
                if (window.omnifactDebug)
                    console.log('[MessageItem Debug] _updateReferences: bubble=', bubble);
                if (bubble) {
                    refsEl = document.createElement('div');
                    refsEl.className = 'references';
                    bubble.appendChild(refsEl);
                }
            }
            if (!refsEl) {
                if (window.omnifactDebug)
                    console.log('[MessageItem Debug] _updateReferences: no refsEl, aborting');
                return;
            }
            // Render references based on format
            if (this._sources && this._sources.length > 0) {
                const html = this._renderSources(this._sources);
                if (window.omnifactDebug)
                    console.log('[MessageItem Debug] _updateReferences: rendering sources, html length=', html.length);
                refsEl.innerHTML = html;
            }
            else if (this._references) {
                refsEl.innerHTML = this._renderLegacyReferences(this._references);
            }
            else {
                refsEl.innerHTML = '';
            }
        }
        /**
         * Render inline sources.
         */
        _renderSources(sources) {
            if (!sources || sources.length === 0)
                return '';
            const items = sources.map((source, index) => {
                const name = source.documentName || 'Document';
                const page = source.page ? ` (p. ${source.page})` : '';
                return `<div class="reference-item">
        <span class="reference-num">[${index + 1}]</span>
        <span class="reference-name">${this._escapeHtml(name)}${page}</span>
      </div>`;
            }).join('');
            return `<div class="references-title">Sources</div>${items}`;
        }
        /**
         * Render legacy references format.
         * Handles structure: { messageId, references: { documents, documentParts } }
         */
        _renderLegacyReferences(refs) {
            if (!refs)
                return '';
            // Handle nested structure from API
            const refsData = refs.references || refs;
            const documents = refsData.documents || [];
            if (documents.length === 0)
                return '';
            const items = documents.map((doc, index) => {
                const name = doc.name || 'Document';
                const metadata = doc.metadata || {};
                const url = metadata.url || metadata.source_url;
                if (url) {
                    return `<div class="reference-item">
          <span class="reference-num">[${index + 1}]</span>
          <a href="${this._escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="reference-link">${this._escapeHtml(name)}</a>
        </div>`;
                }
                return `<div class="reference-item">
        <span class="reference-num">[${index + 1}]</span>
        <span class="reference-name">${this._escapeHtml(name)}</span>
      </div>`;
            }).join('');
            return `<div class="references-title">Sources</div>${items}`;
        }
        /**
         * Escape HTML special characters.
         */
        _escapeHtml(text) {
            if (!text)
                return '';
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
            return String(text).replace(/[&<>"']/g, m => map[m]);
        }
        render() {
            if (!this.shadowRoot)
                return;
            const role = this.getAttribute('role') || 'user';
            const isStreaming = this.hasAttribute('streaming');
            this.shadowRoot.innerHTML = `
      <style>
        :host {
          --primary-color: var(--omnifact-primary, #6366f1);
          --text-color: var(--omnifact-text, #1f2937);
          --user-bg: var(--primary-color);
          --assistant-bg: #f3f4f6;
          display: block;
        }

        .message {
          display: flex;
          gap: 8px;
          max-width: 85%;
        }

        .message.user {
          margin-left: auto;
          flex-direction: row-reverse;
        }

        .message.assistant {
          margin-right: auto;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 14px;
          background: #e5e7eb;
        }

        .message.user .avatar {
          background: var(--user-bg);
          color: white;
        }

        .bubble {
          padding: 10px 14px;
          border-radius: 16px;
          line-height: 1.5;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .message.user .bubble {
          background: var(--user-bg);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .message.assistant .bubble {
          background: var(--assistant-bg);
          color: var(--text-color);
          border-bottom-left-radius: 4px;
        }

        .content {
          font-size: 14px;
        }

        /* Markdown styles */
        .content h2, .content h3, .content h4 {
          margin: 0.5em 0 0.25em;
          font-weight: 600;
        }

        .content h2 { font-size: 1.2em; }
        .content h3 { font-size: 1.1em; }
        .content h4 { font-size: 1em; }

        .content p {
          margin: 0.25em 0;
        }

        .content code {
          background: rgba(0, 0, 0, 0.08);
          padding: 0.1em 0.3em;
          border-radius: 3px;
          font-family: 'Fira Code', 'Consolas', monospace;
          font-size: 0.9em;
        }

        .message.user .content code {
          background: rgba(255, 255, 255, 0.2);
        }

        .content pre {
          background: #1f2937;
          color: #f3f4f6;
          padding: 10px 12px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 0.5em 0;
          font-size: 13px;
        }

        .content pre code {
          background: none;
          padding: 0;
          color: inherit;
        }

        .content ul {
          margin: 0.5em 0;
          padding-left: 1.25em;
        }

        .content li {
          margin: 0.2em 0;
        }

        .content a {
          color: inherit;
          text-decoration: underline;
        }

        .content strong {
          font-weight: 600;
        }

        .content em {
          font-style: italic;
        }

        /* Streaming cursor */
        .streaming .content::after {
          content: '\\25AE';
          animation: blink 1s infinite;
          margin-left: 2px;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        /* Citations */
        .citation {
          color: var(--primary-color);
          cursor: pointer;
          font-size: 0.8em;
        }

        .citation:hover {
          text-decoration: underline;
        }

        /* References section */
        .references {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          font-size: 12px;
        }

        .references-title {
          font-weight: 600;
          margin-bottom: 6px;
          color: var(--text-color);
          opacity: 0.7;
        }

        .reference-item {
          display: flex;
          gap: 6px;
          margin-bottom: 4px;
          align-items: flex-start;
        }

        .reference-num {
          color: var(--primary-color);
          font-weight: 500;
          flex-shrink: 0;
        }

        .reference-name {
          color: var(--text-color);
          opacity: 0.8;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 200px;
        }

        .reference-link {
          color: var(--primary-color);
          text-decoration: none;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 200px;
          display: inline-block;
        }

        .reference-link:hover {
          text-decoration: underline;
        }
      </style>

      <div class="message ${role} ${isStreaming ? 'streaming' : ''}">
        <div class="avatar">${role === 'user' ? '&#128100;' : '&#129302;'}</div>
        <div class="bubble">
          <div class="content">${this._markdownRenderer.render(this._content)}</div>
        </div>
      </div>
    `;
        }
    }

    /**
     * Chat input component.
     * Text input area with send button.
     */
    class ChatInput extends HTMLElement {
        constructor() {
            super();
            this._disabled = false;
            this.attachShadow({ mode: 'open' });
        }
        static get observedAttributes() {
            return ['disabled', 'placeholder'];
        }
        connectedCallback() {
            this.render();
            this._setupEventListeners();
        }
        attributeChangedCallback(name, _oldValue, newValue) {
            if (!this.isConnected)
                return;
            if (name === 'disabled') {
                this._disabled = newValue !== null;
                this._updateDisabledState();
            }
            else if (name === 'placeholder') {
                const textarea = this.shadowRoot?.querySelector('textarea');
                if (textarea) {
                    textarea.placeholder = newValue || 'Type a message...';
                }
            }
        }
        /**
         * Set whether the input is disabled.
         */
        set disabled(value) {
            this._disabled = value;
            if (value) {
                this.setAttribute('disabled', '');
            }
            else {
                this.removeAttribute('disabled');
            }
            this._updateDisabledState();
        }
        get disabled() {
            return this._disabled;
        }
        /**
         * Focus the input field.
         */
        focus() {
            const textarea = this.shadowRoot?.querySelector('textarea');
            if (textarea) {
                textarea.focus();
            }
        }
        /**
         * Clear the input field.
         */
        clear() {
            const textarea = this.shadowRoot?.querySelector('textarea');
            if (textarea) {
                textarea.value = '';
                this._adjustHeight(textarea);
            }
        }
        /**
         * Set theme colors.
         */
        setTheme(config) {
            if (config.primaryColor)
                this.style.setProperty('--primary-color', config.primaryColor);
            if (config.backgroundColor)
                this.style.setProperty('--background-color', config.backgroundColor);
            if (config.textColor)
                this.style.setProperty('--text-color', config.textColor);
        }
        _updateDisabledState() {
            const textarea = this.shadowRoot?.querySelector('textarea');
            const button = this.shadowRoot?.querySelector('button');
            if (textarea)
                textarea.disabled = this._disabled;
            if (button)
                button.disabled = this._disabled;
        }
        _setupEventListeners() {
            const textarea = this.shadowRoot?.querySelector('textarea');
            const button = this.shadowRoot?.querySelector('button');
            // Auto-resize textarea
            textarea?.addEventListener('input', () => {
                if (textarea)
                    this._adjustHeight(textarea);
            });
            // Send on Enter (without Shift)
            textarea?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this._send();
                }
            });
            // Send button click
            button?.addEventListener('click', () => {
                this._send();
            });
        }
        _adjustHeight(textarea) {
            textarea.style.height = 'auto';
            const maxHeight = 120;
            textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
        }
        _send() {
            if (this._disabled)
                return;
            const textarea = this.shadowRoot?.querySelector('textarea');
            const message = textarea?.value.trim();
            if (!message)
                return;
            this.dispatchEvent(new CustomEvent('send', {
                bubbles: true,
                composed: true,
                detail: { message }
            }));
            if (textarea) {
                textarea.value = '';
                this._adjustHeight(textarea);
            }
        }
        render() {
            if (!this.shadowRoot)
                return;
            const placeholder = this.getAttribute('placeholder') || 'Type a message...';
            this.shadowRoot.innerHTML = `
      <style>
        :host {
          --primary-color: #6366f1;
          --background-color: #ffffff;
          --text-color: #1f2937;
          --border-color: #e5e7eb;
          display: block;
          padding: 12px 16px;
          background: var(--background-color);
          border-top: 1px solid var(--border-color);
        }

        .input-container {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }

        textarea {
          flex: 1;
          resize: none;
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 10px 16px;
          font-size: 14px;
          font-family: inherit;
          line-height: 1.4;
          max-height: 120px;
          min-height: 40px;
          height: 40px;
          background: var(--background-color);
          color: var(--text-color);
          outline: none;
          transition: border-color 0.2s;
        }

        textarea:focus {
          border-color: var(--primary-color);
        }

        textarea:disabled {
          background: #f9fafb;
          cursor: not-allowed;
        }

        textarea::placeholder {
          color: #9ca3af;
        }

        button {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: var(--primary-color);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, background-color 0.2s;
          flex-shrink: 0;
        }

        button:hover:not(:disabled) {
          transform: scale(1.05);
        }

        button:active:not(:disabled) {
          transform: scale(0.95);
        }

        button:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        button svg {
          width: 20px;
          height: 20px;
          fill: white;
        }
      </style>

      <div class="input-container">
        <textarea
          placeholder="${placeholder}"
          rows="1"
          ${this._disabled ? 'disabled' : ''}
        ></textarea>
        <button
          type="button"
          aria-label="Send message"
          ${this._disabled ? 'disabled' : ''}
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    `;
        }
    }

    /**
     * Typing indicator component.
     * Shows animated dots while the assistant is responding.
     */
    class TypingIndicator extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
            this.render();
        }
        /**
         * Show the typing indicator.
         */
        show() {
            this.removeAttribute('hidden');
        }
        /**
         * Hide the typing indicator.
         */
        hide() {
            this.setAttribute('hidden', '');
        }
        /**
         * Set theme colors.
         */
        setTheme(config) {
            if (config.primaryColor) {
                this.style.setProperty('--dot-color', config.primaryColor);
            }
        }
        render() {
            if (!this.shadowRoot)
                return;
            this.shadowRoot.innerHTML = `
      <style>
        :host {
          --dot-color: #6366f1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
        }

        :host([hidden]) {
          display: none;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
        }

        .dots {
          display: flex;
          gap: 4px;
          padding: 12px 16px;
          background: #f3f4f6;
          border-radius: 16px;
          border-bottom-left-radius: 4px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--dot-color);
          opacity: 0.4;
          animation: bounce 1.4s infinite ease-in-out;
        }

        .dot:nth-child(1) {
          animation-delay: 0s;
        }

        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          40% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }
      </style>

      <div class="avatar">&#129302;</div>
      <div class="dots">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    `;
        }
    }

    /**
     * Omnifact Chat Widget
     * Embeddable AI chat widget for Omnifact endpoints.
     *
     * @license MIT
     */
    // Import components
    // Register custom elements (only if not already registered)
    const registerElement = (name, constructor) => {
        if (!customElements.get(name)) {
            customElements.define(name, constructor);
        }
    };
    registerElement('omnifact-chat-widget', OmnifactChatWidget);
    registerElement('omnifact-chat-bubble', ChatBubble);
    registerElement('omnifact-chat-window', ChatWindow);
    registerElement('omnifact-message-list', MessageList);
    registerElement('omnifact-message-item', MessageItem);
    registerElement('omnifact-chat-input', ChatInput);
    registerElement('omnifact-typing-indicator', TypingIndicator);
    // Log initialization
    console.log('[OmnifactWidget] Initialized');

    exports.ApiClient = ApiClient;
    exports.ChatBubble = ChatBubble;
    exports.ChatInput = ChatInput;
    exports.ChatWindow = ChatWindow;
    exports.ConfigManager = ConfigManager;
    exports.MarkdownRenderer = MarkdownRenderer;
    exports.MessageItem = MessageItem;
    exports.MessageList = MessageList;
    exports.OmnifactChatWidget = OmnifactChatWidget;
    exports.SSEHandler = SSEHandler;
    exports.StorageService = StorageService;
    exports.TypingIndicator = TypingIndicator;
    exports.default = OmnifactChatWidget;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
//# sourceMappingURL=omnifact-widget.js.map
