/**
 * Omnifact Chat Widget
 * Embeddable AI chat widget for Omnifact endpoints.
 *
 * @license MIT
 */

// Import components
import { OmnifactChatWidget } from './components/omnifact-chat-widget.js';
import { ChatBubble } from './components/chat-bubble.js';
import { ChatWindow } from './components/chat-window.js';
import { MessageList } from './components/message-list.js';
import { MessageItem } from './components/message-item.js';
import { ChatInput } from './components/chat-input.js';
import { TypingIndicator } from './components/typing-indicator.js';

// Import services (for programmatic use)
import { ApiClient } from './services/api-client.js';
import { SSEHandler } from './services/sse-handler.js';
import { StorageService } from './services/storage-service.js';

// Import utilities
import { ConfigManager } from './utils/config-manager.js';
import { MarkdownRenderer } from './utils/markdown-renderer.js';

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

// Export for programmatic use
export {
  // Main component
  OmnifactChatWidget,

  // Child components
  ChatBubble,
  ChatWindow,
  MessageList,
  MessageItem,
  ChatInput,
  TypingIndicator,

  // Services
  ApiClient,
  SSEHandler,
  StorageService,

  // Utilities
  ConfigManager,
  MarkdownRenderer
};

// Default export
export default OmnifactChatWidget;
