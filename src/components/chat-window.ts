import type { ThemeConfig } from '../types';

/**
 * Chat window component.
 * Container for the chat interface including header, messages, and input.
 */
export class ChatWindow extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes(): string[] {
    return ['title', 'hidden'];
  }

  connectedCallback(): void {
    this.render();
    this._setupEventListeners();
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
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
  setTheme(config: ThemeConfig): void {
    if (config.primaryColor) this.style.setProperty('--primary-color', config.primaryColor);
    if (config.backgroundColor) this.style.setProperty('--background-color', config.backgroundColor);
    if (config.textColor) this.style.setProperty('--text-color', config.textColor);
  }

  private _setupEventListeners(): void {
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

  private render(): void {
    if (!this.shadowRoot) return;

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
