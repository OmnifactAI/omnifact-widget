import { MarkdownRenderer } from '../utils/markdown-renderer';
import type { ThemeConfig, InlineSource, LegacyReferences, LegacyDocument } from '../types';

/**
 * Individual message component.
 * Displays a single chat message with markdown rendering.
 */
export class MessageItem extends HTMLElement {
  private _content = '';
  private _references: LegacyReferences | null = null;
  private _sources: InlineSource[] | null = null;
  private _markdownRenderer = new MarkdownRenderer();

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes(): string[] {
    return ['role', 'streaming', 'data-content'];
  }

  connectedCallback(): void {
    // Check for content from data attribute first
    const dataContent = this.getAttribute('data-content');
    if (dataContent && !this._content) {
      this._content = dataContent;
    }

    this.render();
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (this.isConnected) {
      if (name === 'streaming') {
        // Just update the streaming class, don't re-render everything
        const messageEl = this.shadowRoot?.querySelector('.message');
        if (messageEl) {
          if (newValue !== null) {
            messageEl.classList.add('streaming');
          } else {
            messageEl.classList.remove('streaming');
          }
        }
      } else {
        this.render();
      }
    }
  }

  /**
   * Set the message content.
   */
  set content(value: string) {
    this._content = value || '';
    this._updateContent();
  }

  get content(): string {
    return this._content;
  }

  /**
   * Append content to the message (for streaming).
   */
  appendContent(chunk: string): void {
    this._content += chunk;
    this._updateContent();
  }

  /**
   * Set document references (legacy format).
   */
  set references(value: LegacyReferences | null) {
    if (window.omnifactDebug) {
      console.log('[MessageItem Debug] Setting references:', value);
    }
    this._references = value;
    this._updateReferences();
  }

  get references(): LegacyReferences | null {
    return this._references;
  }

  /**
   * Set inline sources.
   */
  set sources(value: InlineSource[] | null) {
    if (window.omnifactDebug) {
      console.log('[MessageItem Debug] Setting sources:', value);
    }
    this._sources = value;
    this._updateReferences();
  }

  get sources(): InlineSource[] | null {
    return this._sources;
  }

  /**
   * Set theme colors.
   */
  setTheme(config: ThemeConfig): void {
    if (config.primaryColor) this.style.setProperty('--primary-color', config.primaryColor);
    if (config.textColor) this.style.setProperty('--text-color', config.textColor);
  }

  /**
   * Update just the content area (more efficient than full re-render).
   */
  private _updateContent(): void {
    if (!this.shadowRoot) return;
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
  private _processCitations(content: string): string {
    if (!this._sources) return content;

    // Create a map of sourceId to index
    const sourceMap = new Map<string, number>();
    this._sources.forEach((source, index) => {
      sourceMap.set(source.sourceId, index + 1);
    });

    // Replace :cite[sourceId] with [n] links
    return content.replace(/:cite\[([^\]]+)\]/g, (match, sourceId: string) => {
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
  private _updateReferences(): void {
    if (!this.shadowRoot) {
      if (window.omnifactDebug) console.log('[MessageItem Debug] _updateReferences: no shadowRoot');
      return;
    }

    let refsEl = this.shadowRoot.querySelector('.references');

    // Create references element if it doesn't exist
    if (!refsEl) {
      const bubble = this.shadowRoot.querySelector('.bubble');
      if (window.omnifactDebug) console.log('[MessageItem Debug] _updateReferences: bubble=', bubble);
      if (bubble) {
        refsEl = document.createElement('div');
        refsEl.className = 'references';
        bubble.appendChild(refsEl);
      }
    }

    if (!refsEl) {
      if (window.omnifactDebug) console.log('[MessageItem Debug] _updateReferences: no refsEl, aborting');
      return;
    }

    // Render references based on format
    if (this._sources && this._sources.length > 0) {
      const html = this._renderSources(this._sources);
      if (window.omnifactDebug) console.log('[MessageItem Debug] _updateReferences: rendering sources, html length=', html.length);
      refsEl.innerHTML = html;
    } else if (this._references) {
      refsEl.innerHTML = this._renderLegacyReferences(this._references);
    } else {
      refsEl.innerHTML = '';
    }
  }

  /**
   * Render inline sources.
   */
  private _renderSources(sources: InlineSource[]): string {
    if (!sources || sources.length === 0) return '';

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
  private _renderLegacyReferences(refs: LegacyReferences): string {
    if (!refs) return '';

    // Handle nested structure from API
    const refsData = refs.references || refs;
    const documents: LegacyDocument[] = refsData.documents || [];
    if (documents.length === 0) return '';

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
  private _escapeHtml(text: string): string {
    if (!text) return '';
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  private render(): void {
    if (!this.shadowRoot) return;

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
