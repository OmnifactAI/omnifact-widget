/**
 * Widget configuration options.
 */
export interface WidgetConfig {
  endpointUrl: string;
  endpointId: string;
  apiKey: string;
  position: 'bottom-right' | 'bottom-left';
  title: string;
  welcomeMessage: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  storageKey: string;
  enablePersistence: boolean;
  enableInlineSources: boolean;
  enableAgenticWorkflow: boolean;
  hideSources: boolean;
  debug: boolean;
}

/**
 * Chat message structure.
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isWelcome?: boolean;
  isError?: boolean;
  sources?: InlineSource[];
  references?: LegacyReferences;
}

/**
 * API message format (sent to the API).
 */
export interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Inline source from message_source events.
 */
export interface InlineSource {
  sourceId: string;
  documentId: string;
  documentName: string;
  page?: number;
  sourceType: 'kb';
  messageId?: string;
}

/**
 * Legacy references format.
 */
export interface LegacyReferences {
  messageId?: string;
  references?: {
    documents: LegacyDocument[];
    documentParts: DocumentPart[];
  };
  documents?: LegacyDocument[];
  documentParts?: DocumentPart[];
}

/**
 * Legacy document reference.
 */
export interface LegacyDocument {
  id: string;
  name: string;
  metadata?: {
    url?: string;
    source_url?: string;
    [key: string]: unknown;
  };
}

/**
 * Document part reference.
 */
export interface DocumentPart {
  documentId: string;
  type: 'page';
  number: number;
}

/**
 * Widget state.
 */
export interface WidgetState {
  isOpen: boolean;
  messages: ChatMessage[];
  isTyping: boolean;
  sessionId: string | null;
}

/**
 * Stored state in localStorage.
 */
export interface StoredState {
  sessionId: string | null;
  messages: ChatMessage[];
  timestamp?: number;
}

/**
 * SSE stream result.
 */
export interface StreamResult {
  content: string;
  messageId: string | null;
  references: LegacyReferences | null;
  sources: InlineSource[] | null;
}

/**
 * SSE stream callbacks.
 */
export interface StreamCallbacks {
  onChunk?: (chunk: string, accumulated: string, messageId: string | null) => void;
  onReferences?: (refs: LegacyReferences) => void;
  onSource?: (source: InlineSource) => void;
  onComplete?: (result: StreamResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Theme configuration subset.
 */
export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
}

/**
 * Declare global window properties for debug mode.
 */
declare global {
  interface Window {
    omnifactDebug?: boolean;
  }
}
