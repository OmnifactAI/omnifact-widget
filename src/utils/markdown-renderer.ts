/**
 * Options for the markdown renderer.
 */
export interface MarkdownRendererOptions {
  sanitize?: boolean;
  linkTarget?: string;
}

/**
 * Lightweight markdown renderer for chat messages.
 * Supports common markdown elements without external dependencies.
 */
export class MarkdownRenderer {
  private options: Required<MarkdownRendererOptions>;

  constructor(options: MarkdownRendererOptions = {}) {
    this.options = {
      sanitize: true,
      linkTarget: '_blank',
      ...options
    };
  }

  /**
   * Render markdown text to HTML.
   */
  render(text: string): string {
    if (!text) return '';

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
  private _escapeHtml(text: string): string {
    const map: Record<string, string> = {
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
  private _renderCodeBlocks(text: string): string {
    return text.replace(
      /```(\w*)\n([\s\S]*?)```/g,
      (_, lang: string, code: string) => {
        const langClass = lang ? ` class="language-${lang}"` : '';
        return `<pre><code${langClass}>${code.trim()}</code></pre>`;
      }
    );
  }

  /**
   * Render inline code.
   * `code`
   */
  private _renderInlineCode(text: string): string {
    return text.replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  /**
   * Render headers.
   * # H1, ## H2, ### H3
   */
  private _renderHeaders(text: string): string {
    return text
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>');
  }

  /**
   * Render bold text.
   * **bold** or __bold__
   */
  private _renderBold(text: string): string {
    return text.replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_, g1: string, g2: string) => `<strong>${g1 || g2}</strong>`);
  }

  /**
   * Render italic text.
   * *italic* or _italic_ (but not within words)
   */
  private _renderItalic(text: string): string {
    // Match *text* but not **text** (already handled)
    return text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  }

  /**
   * Render links.
   * [text](url)
   */
  private _renderLinks(text: string): string {
    const target = this.options.linkTarget;
    return text.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      `<a href="$2" target="${target}" rel="noopener noreferrer">$1</a>`
    );
  }

  /**
   * Render unordered lists.
   * - item or * item
   */
  private _renderLists(text: string): string {
    const lines = text.split('\n');
    const result: string[] = [];
    let inList = false;

    for (const line of lines) {
      const listMatch = line.match(/^[\-\*]\s+(.+)$/);

      if (listMatch) {
        if (!inList) {
          result.push('<ul>');
          inList = true;
        }
        result.push(`<li>${listMatch[1]}</li>`);
      } else {
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
  private _renderLineBreaks(text: string): string {
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
