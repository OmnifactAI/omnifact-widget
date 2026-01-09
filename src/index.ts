/**
 * Omnifact Chat Widget
 * Embeddable AI chat widget for Omnifact endpoints.
 *
 * @license MIT
 */

// Import components
import { OmnifactChatWidget } from './components/omnifact-chat-widget';
import { ChatBubble } from './components/chat-bubble';
import { ChatWindow } from './components/chat-window';
import { MessageList } from './components/message-list';
import { MessageItem } from './components/message-item';
import { ChatInput } from './components/chat-input';
import { TypingIndicator } from './components/typing-indicator';

// Import services (for programmatic use)
import { ApiClient } from './services/api-client';
import { SSEHandler } from './services/sse-handler';
import { StorageService } from './services/storage-service';

// Import utilities
import { ConfigManager } from './utils/config-manager';
import { MarkdownRenderer } from './utils/markdown-renderer';

// Export types
export type {
  WidgetConfig,
  ChatMessage,
  ApiMessage,
  InlineSource,
  LegacyReferences,
  LegacyDocument,
  StreamResult,
  StreamCallbacks,
  ThemeConfig
} from './types';

// Register custom elements (only if not already registered)
const registerElement = (name: string, constructor: CustomElementConstructor): void => {
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
