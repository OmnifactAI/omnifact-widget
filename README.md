# Omnifact Chat Widget

An embeddable AI chat widget for integrating Omnifact AI assistants onto any website. Built with Web Components for maximum compatibility and zero dependencies.

## Features

- **Streaming Responses** - See AI responses appear in real-time
- **Conversation Persistence** - Chat history saved to localStorage
- **Markdown Rendering** - Support for bold, italic, code, lists, and more
- **Customizable Theme** - Match colors to your brand
- **Floating Bubble UI** - Non-intrusive chat bubble that expands on click
- **Mobile Responsive** - Works on all screen sizes
- **Zero Dependencies** - Pure JavaScript, no external libraries

## Installation

### Script Tag (Recommended)

Download the widget and include it in your HTML:

```html
<script src="omnifact-widget.min.js"></script>
```

### npm (Coming Soon)

```bash
npm install omnifact-widget
```

## Quick Start

Add the widget to your page with your Omnifact endpoint credentials:

```html
<omnifact-chat-widget
  endpoint-url="https://connect.omnifact.ai"
  endpoint-id="YOUR_ENDPOINT_ID"
></omnifact-chat-widget>

<script src="omnifact-widget.min.js"></script>
```

## Configuration

The widget can be configured via HTML attributes or JSON. Attributes take precedence over JSON.

### HTML Attributes

```html
<omnifact-chat-widget
  endpoint-url="https://connect.omnifact.ai"
  endpoint-id="ep_12345"
  position="bottom-right"
  title="Chat Support"
  welcome-message="Hello! How can I help you?"
  primary-color="#6366f1"
  secondary-color="#818cf8"
  background-color="#ffffff"
  text-color="#1f2937"
></omnifact-chat-widget>
```

### JSON Configuration

```html
<omnifact-chat-widget>
  <script type="application/json">
    {
      "endpoint-url": "https://connect.omnifact.ai",
      "endpoint-id": "ep_12345",
      "title": "Chat Support",
      "welcome-message": "Hello! How can I help you?",
      "primary-color": "#6366f1"
    }
  </script>
</omnifact-chat-widget>
```

### Mixed Configuration

You can use both JSON and attributes together. Attributes override JSON values:

```html
<!-- primary-color will be #ef4444 (attribute wins) -->
<omnifact-chat-widget primary-color="#ef4444">
  <script type="application/json">
    {
      "endpoint-url": "https://connect.omnifact.ai",
      "endpoint-id": "ep_12345",
      "primary-color": "#6366f1"
    }
  </script>
</omnifact-chat-widget>
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoint-url` | string | (required) | Base URL for the Omnifact API |
| `endpoint-id` | string | (required) | Your chat endpoint ID |
| `api-key` | string | (optional) | API key (if required by your endpoint) |
| `position` | string | `bottom-right` | Widget position: `bottom-right` or `bottom-left` |
| `title` | string | `Chat with us` | Title shown in the chat window header |
| `welcome-message` | string | `Hello! How can I help you today?` | Initial message from the assistant |
| `primary-color` | string | `#6366f1` | Main accent color (bubble, header, user messages) |
| `secondary-color` | string | `#818cf8` | Secondary accent color |
| `background-color` | string | `#ffffff` | Chat window background color |
| `text-color` | string | `#1f2937` | Text color |
| `storage-key` | string | `omnifact-chat` | localStorage key for persistence |
| `enable-persistence` | boolean | `true` | Enable/disable conversation persistence |

## JavaScript API

You can control the widget programmatically:

```javascript
// Get widget reference
const widget = document.querySelector('omnifact-chat-widget');

// Open the chat window
widget.open();

// Close the chat window
widget.close();

// Send a message programmatically
widget.sendMessage('Hello from code!');

// Clear chat history
widget.clearHistory();
```

## Theming

### Custom Colors

Customize the widget to match your brand:

```html
<omnifact-chat-widget
  primary-color="#10b981"
  background-color="#f0fdf4"
  text-color="#065f46"
></omnifact-chat-widget>
```

### Dark Theme Example

```html
<omnifact-chat-widget
  primary-color="#e94560"
  background-color="#16213e"
  text-color="#eaeaea"
></omnifact-chat-widget>
```

## Markdown Support

The widget renders markdown in assistant responses:

- **Bold**: `**text**` or `__text__`
- *Italic*: `*text*`
- `Inline code`: `` `code` ``
- Code blocks: ` ``` `
- Lists: `- item` or `* item`
- Links: `[text](url)`
- Headers: `#`, `##`, `###`

## Browser Support

- Chrome 67+
- Firefox 63+
- Safari 10.1+
- Edge 79+

The widget uses native Web Components (Custom Elements v1) which are supported in all modern browsers.

## Development

### Building from Source

```bash
cd omnifact-widget

# Install dependencies
npm install

# Build all formats
npm run build

# Development mode (watch)
npm run dev
```

### Output Files

| File | Format | Use Case |
|------|--------|----------|
| `omnifact-widget.js` | IIFE | Development, debugging |
| `omnifact-widget.min.js` | IIFE (minified) | Production |
| `omnifact-widget.esm.js` | ES Module | Modern bundlers |
| `omnifact-widget.umd.js` | UMD | Universal compatibility |

## Security Note

If you use an API key, it will be exposed in the browser. For production deployments with API keys, consider:

1. Using a server-side proxy that adds the API key
2. Implementing rate limiting
3. Using domain restrictions on your API key

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [Omnifact Documentation](https://connect.omnifact.ai/docs)
- [GitHub Repository](https://github.com/omnifact/omnifact-widget)
- [Report Issues](https://github.com/omnifact/omnifact-widget/issues)
