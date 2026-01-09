# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Omnifact Chat Widget - an embeddable AI chat widget built with Web Components and TypeScript. Zero runtime dependencies, designed for maximum browser compatibility.

## Commands

```bash
npm run build      # Build all formats (IIFE, ESM, UMD, minified)
npm run dev        # Watch mode for development
npm run typecheck  # TypeScript validation (no emit)
```

## Build Output

- `dist/omnifact-widget.js` - IIFE (development)
- `dist/omnifact-widget.min.js` - IIFE minified (production)
- `dist/omnifact-widget.esm.js` - ES Module
- `dist/omnifact-widget.umd.js` - UMD
- `dist/types/` - TypeScript declarations

## Architecture

### Component Hierarchy

```
OmnifactChatWidget (src/components/omnifact-chat-widget.ts)
├── ChatBubble (floating button)
└── ChatWindow (chat interface)
    ├── MessageList
    │   └── MessageItem (repeated)
    ├── TypingIndicator
    └── ChatInput
```

### Services

- **ApiClient** (`src/services/api-client.ts`) - REST API communication with Omnifact endpoint
- **SSEHandler** (`src/services/sse-handler.ts`) - Server-Sent Events stream processor for real-time responses
- **StorageService** (`src/services/storage-service.ts`) - localStorage persistence (24h timeout, 100 message limit)

### Utilities

- **ConfigManager** (`src/utils/config-manager.ts`) - Configuration loading from JSON script tags and HTML attributes
- **MarkdownRenderer** (`src/utils/markdown-renderer.ts`) - Lightweight markdown to HTML conversion

### Key Patterns

- **Shadow DOM**: Each component uses isolated shadow DOM for style encapsulation
- **Custom Events**: Components communicate via CustomEvents with `bubbles: true, composed: true`
- **Configuration Priority**: HTML attributes > JSON config > defaults
- **State Management**: Centralized in main widget component, persisted via StorageService

### Types

All TypeScript interfaces defined in `src/types.ts`: `WidgetConfig`, `ChatMessage`, `ApiMessage`, `InlineSource`, `WidgetState`, `StreamResult`, `StreamCallbacks`.

## API Endpoint Pattern

`{baseUrl}/v1/endpoints/{endpointId}/chat`

Streaming via SSE with multiple event types for content, sources, and completion status.
