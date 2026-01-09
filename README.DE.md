# Omnifact Chat Widget

Ein einbettbares KI-Chat-Widget zur Integration von Omnifact KI-Assistenten auf beliebigen Websites. Entwickelt mit Web Components und TypeScript für maximale Kompatibilität und Typsicherheit.

## Funktionen

- **Streaming-Antworten** - KI-Antworten erscheinen in Echtzeit via SSE
- **Gesprächsspeicherung** - Chat-Verlauf wird im localStorage gespeichert
- **Markdown-Rendering** - Unterstützung für Fett, Kursiv, Code, Listen und mehr
- **Inline-Zitate** - Quellenverweise mit klickbaren Zitaten
- **Anpassbares Design** - Farben passend zu Ihrer Marke
- **Schwebende Bubble-UI** - Unauffällige Chat-Bubble, die sich bei Klick öffnet
- **Mobilfreundlich** - Funktioniert auf allen Bildschirmgrößen
- **TypeScript** - Vollständige Typdefinitionen enthalten
- **Keine Abhängigkeiten** - Keine externen Laufzeitbibliotheken

## Installation

### CDN (Empfohlen)

Verwenden Sie unpkg oder jsDelivr zum direkten Laden von npm:

```html
<script src="https://unpkg.com/omnifact-widget"></script>
```

Oder mit einer bestimmten Version:

```html
<script src="https://unpkg.com/omnifact-widget@1.0.0"></script>
```

### npm

```bash
npm install omnifact-widget
```

Dann in Ihrem Code importieren:

```javascript
import 'omnifact-widget';
```

Oder für programmatische Verwendung:

```javascript
import { OmnifactChatWidget, ApiClient } from 'omnifact-widget';
```

## Schnellstart

Fügen Sie das Widget mit Ihren Omnifact-Endpoint-Zugangsdaten zu Ihrer Seite hinzu:

```html
<omnifact-chat-widget
  endpoint-url="https://connect.omnifact.ai"
  endpoint-id="IHRE_ENDPOINT_ID"
></omnifact-chat-widget>

<script src="https://unpkg.com/omnifact-widget"></script>
```

## Konfiguration

Das Widget kann über HTML-Attribute oder JSON konfiguriert werden. Attribute haben Vorrang vor JSON.

### HTML-Attribute

```html
<omnifact-chat-widget
  endpoint-url="https://connect.omnifact.ai"
  endpoint-id="ep_12345"
  position="bottom-right"
  title="Chat Support"
  welcome-message="Hallo! Wie kann ich Ihnen helfen?"
  primary-color="#6366f1"
  enable-inline-sources="true"
></omnifact-chat-widget>
```

### JSON-Konfiguration

```html
<omnifact-chat-widget>
  <script type="application/json">
    {
      "endpoint-url": "https://connect.omnifact.ai",
      "endpoint-id": "ep_12345",
      "title": "Chat Support",
      "welcome-message": "Hallo! Wie kann ich Ihnen helfen?",
      "primary-color": "#6366f1",
      "enable-inline-sources": true
    }
  </script>
</omnifact-chat-widget>
```

### Gemischte Konfiguration

Sie können JSON und Attribute zusammen verwenden. Attribute überschreiben JSON-Werte:

```html
<!-- primary-color wird #ef4444 sein (Attribut gewinnt) -->
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

## Konfigurationsoptionen

| Option | Typ | Standard | Beschreibung |
|--------|-----|----------|--------------|
| `endpoint-url` | string | (erforderlich) | Basis-URL für die Omnifact API |
| `endpoint-id` | string | (erforderlich) | Ihre Chat-Endpoint-ID |
| `api-key` | string | — | API-Schlüssel (falls von Ihrem Endpoint benötigt) |
| `position` | string | `bottom-right` | Widget-Position: `bottom-right` oder `bottom-left` |
| `title` | string | `Chat with us` | Titel im Chat-Fenster-Header |
| `welcome-message` | string | `Hello! How can I help you today?` | Erste Nachricht vom Assistenten |
| `primary-color` | string | `#6366f1` | Hauptakzentfarbe (Bubble, Header, Benutzernachrichten) |
| `secondary-color` | string | `#818cf8` | Sekundäre Akzentfarbe |
| `background-color` | string | `#ffffff` | Hintergrundfarbe des Chat-Fensters |
| `text-color` | string | `#1f2937` | Textfarbe |
| `storage-key` | string | `omnifact-chat` | localStorage-Schlüssel für Persistenz |
| `enable-persistence` | boolean | `true` | Gesprächsspeicherung aktivieren/deaktivieren |
| `enable-inline-sources` | boolean | `false` | Inline-Quellenzitate in Antworten aktivieren |
| `enable-agentic-workflow` | boolean | `false` | Agentischen Workflow-Modus aktivieren |
| `debug` | boolean | `false` | SSE-Events zur Fehlersuche in der Konsole ausgeben |

## JavaScript-API

Sie können das Widget programmatisch steuern:

```javascript
// Widget-Referenz holen
const widget = document.querySelector('omnifact-chat-widget');

// Chat-Fenster öffnen
widget.open();

// Chat-Fenster schließen
widget.close();

// Nachricht programmatisch senden
widget.sendMessage('Hallo aus dem Code!');

// Chat-Verlauf löschen
widget.clearHistory();
```

## Design anpassen

### Eigene Farben

Passen Sie das Widget an Ihre Marke an:

```html
<omnifact-chat-widget
  primary-color="#10b981"
  background-color="#f0fdf4"
  text-color="#065f46"
></omnifact-chat-widget>
```

### Dunkles Design Beispiel

```html
<omnifact-chat-widget
  primary-color="#e94560"
  background-color="#16213e"
  text-color="#eaeaea"
></omnifact-chat-widget>
```

## Markdown-Unterstützung

Das Widget rendert Markdown in Assistenten-Antworten:

- **Fett**: `**text**` oder `__text__`
- *Kursiv*: `*text*`
- `Inline-Code`: `` `code` ``
- Code-Blöcke: ` ``` `
- Listen: `- element` oder `* element`
- Links: `[text](url)`
- Überschriften: `#`, `##`, `###`

## Browser-Unterstützung

- Chrome 67+
- Firefox 63+
- Safari 10.1+
- Edge 79+

Das Widget verwendet native Web Components (Custom Elements v1), die in allen modernen Browsern unterstützt werden.

## Entwicklung

### Aus Quellcode bauen

```bash
# Repository klonen
git clone https://github.com/OmnifactAI/omnifact-widget.git
cd omnifact-widget

# Abhängigkeiten installieren
npm install

# Alle Formate bauen
npm run build

# Entwicklungsmodus (watch)
npm run dev
```

### Ausgabedateien

| Datei | Format | Verwendungszweck |
|-------|--------|------------------|
| `omnifact-widget.js` | IIFE | Entwicklung, Debugging |
| `omnifact-widget.min.js` | IIFE (minifiziert) | Produktion |
| `omnifact-widget.esm.js` | ES Module | Moderne Bundler |
| `omnifact-widget.umd.js` | UMD | Universelle Kompatibilität |

## Sicherheitshinweis

Wenn Sie einen API-Schlüssel verwenden, wird dieser im Browser sichtbar sein. Für Produktionsumgebungen mit API-Schlüsseln sollten Sie Folgendes in Betracht ziehen:

1. Einen serverseitigen Proxy verwenden, der den API-Schlüssel hinzufügt
2. Rate-Limiting implementieren
3. Domain-Einschränkungen für Ihren API-Schlüssel verwenden

## Lizenz

MIT-Lizenz - siehe [LICENSE](LICENSE) für Details.

## Links

- [Omnifact](https://omnifact.ai)
- [GitHub Repository](https://github.com/OmnifactAI/omnifact-widget)
- [Probleme melden](https://github.com/OmnifactAI/omnifact-widget/issues)
